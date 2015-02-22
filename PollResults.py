# Must install MySQLdb Library - http://sourceforge.net/projects/mysql-python/files/
# Run using Python 2.7


import urllib
import os
import sys
import zipfile
import shutil
import MySQLdb
import math

HOST = "localhost"
USER = "root"
PASSWORD = "code2015"
DATABASE = "code2015"

# define result years and URLs to grab
resultURLs = {
    2011: "http://www.elections.ca/scripts/OVR2011/34/data_donnees/pollresults_resultatsbureau_canada.zip",
    2008: "http://www.elections.ca/scripts/OVR2008/31/data/pollresults_resultatsbureau_canada.zip",
    2006: "http://www.elections.ca/scripts/OVR2006/25/data_donnees/pollresults_resultatsbureau_canada.zip",
}

def processElectionURL(electYear, url):

    fileName = "/home/code2015/CODE2015/" + str(electYear) + ".zip"
    tmpPath = "/home/code2015/CODE2015/tmp/"


    urllib.URLopener().retrieve(url, fileName)

    # Uncompress
    fileHandle = open(fileName, 'rb')
    z = zipfile.ZipFile(fileHandle)
    for name in z.namelist():
        z.extract(name, tmpPath)
    fileHandle.close()

    db = MySQLdb.connect(HOST, USER, PASSWORD, DATABASE)
    cursor = db.cursor()

    createElectionResultsTable(cursor)
    db.commit()

    for f in os.listdir(tmpPath):
        if "pollresults_" in f:
            importResults(electYear, tmpPath + f, cursor)

    db.commit()

    cleanResults(cursor)
    db.commit()

    calcSeats()

    db.close()

    # clean up
    shutil.rmtree(tmpPath)
    os.remove(fileName)

def importResults(electYear, file, cursor):

    print("import: " + file)

    strSQL = "LOAD DATA INFILE '" + file + \
                "' INTO TABLE election_results " + \
                "FIELDS TERMINATED BY ',' " + \
                    "ENCLOSED BY '\"' " + \
                "IGNORE 1 LINES" + \
                "(DistrictNumber,DistrictName,@dummy,PollStation,PollStationName," + \
                    "VoidPoll,NoPollHeld,MergeWith,RejectedBallots,ElectorsCount," + \
                    "CandidateLast,CandidateMiddle,CandidateFirst,Party,@dummy," + \
                    "Incumbent,Elected,VoteCount) "

    cursor.execute(strSQL)

    strSQL = "UPDATE election_results SET ElectYear = " + str(electYear) + " " + \
             "WHERE ElectYear IS NULL;"

    cursor.execute(strSQL)

def cleanResults(cursor):

    # remove floating quote from district name
    strSQL = "UPDATE election_results SET DistrictName = Replace(DistrictName, '\"', '')"
    cursor.execute(strSQL)

    # remove floating quote from district name
    strSQL = "DELETE FROM election_results WHERE Party = ''"
    cursor.execute(strSQL)

def calcSeats():

    db = MySQLdb.connect(HOST, USER, PASSWORD, DATABASE)
    cursor = db.cursor()

    strSQL = "DROP TABLE IF EXISTS seat_distribution"
    cursor.execute(strSQL)

    db.commit()

    createSeatDistributionTable(cursor)
    db.commit()

    strSQL = "INSERT INTO seat_distribution (ElectYear, Party, VoteCount, ActualSeats) " + \
            "SELECT a.ElectYear, a.Party, a.VoteCount, b.ActualSeats " + \
            "FROM" + \
            "(SELECT ElectYear, Party, SUM(VoteCount) as 'VoteCount' " + \
            "FROM election_results " + \
            "GROUP BY ElectYear, Party) a " + \
            "LEFT JOIN " + \
            "(SELECT ElectYear, Party, COUNT(Party) as 'ActualSeats' " + \
            "FROM " + \
            "(SELECT DISTINCT ElectYear, Party, CandidateLast, CandidateFirst " + \
            "FROM election_results " + \
            "WHERE Elected='Y' " + \
            "GROUP BY ElectYear, Party, CandidateLast, CandidateFirst) a " + \
            "GROUP BY ElectYear, Party) b " + \
            "ON a.ElectYear = b.ElectYear AND a.Party = b.Party "

    cursor.execute(strSQL)
    db.commit()

    # get election years
    strSQL = "SELECT DISTINCT ElectYear FROM seat_distribution"
    cursor.execute(strSQL)
    queryResults = cursor.fetchall()

    years = []
    for row in queryResults:
        years.append(row[0])

    for year in years:

        # get vote distribution
        strSQL = "SELECT Party, VoteCount FROM seat_distribution WHERE ElectYear = " + str(year)
        cursor.execute(strSQL)
        queryResults = cursor.fetchall()

        votes = {}
        for row in queryResults:
            votes[row[0]] = row[1]

        # get total actual seats
        strSQL = "SELECT SUM(ActualSeats) FROM seat_distribution WHERE ElectYear = " + str(year)
        cursor.execute(strSQL)
        queryResults = cursor.fetchall()
        for row in queryResults:
            totalSeats = row[0]
            remainingSeats = row[0]

        # calculate total votes
        totalVotes = 0
        for party in votes.keys():
            totalVotes += votes[party]

        # calculate party percentages
        percentages = {}
        for party in votes.keys():
            percentages[party] = float(votes[party]) / float(totalVotes)

        # calculate initial seats
        seats = {}
        for party in percentages.keys():
            seats[party] = math.floor(float(totalSeats) * percentages[party])
            remainingSeats = float(remainingSeats) - seats[party]

        # handle remaining seats
        for party in votes.keys():
            seats[party] += math.floor(remainingSeats * percentages[party])
            remainingSeats = float(remainingSeats) - math.floor(remainingSeats * percentages[party])

        # distribute last remaining seat
        if remainingSeats > 0:

            highest = 0
            highestParty = ""

            for party in votes.keys():
                if votes[party] > highest:
                    highest = votes[party]
                    highestParty = party

            seats[highestParty] += remainingSeats

        # write seats to table
        for party in seats.keys():

            strSQL = "UPDATE seat_distribution " + \
                    "SET PRSeats = " + str(int(seats[party])) + " " + \
                    "WHERE " + \
                        "Party = '" + party + "' AND " + \
                        "ElectYear = " + str(year)

            cursor.execute(strSQL)
            db.commit()



def createElectionResultsTable(cursor):

    strSQL = "CREATE TABLE IF NOT EXISTS `election_results` (" + \
            "`ElectYear` int(11) DEFAULT NULL," + \
            "`DistrictNumber` int(11) NOT NULL," + \
            "`DistrictName` varchar(80) NOT NULL," + \
            "`PollStation` varchar(40) NOT NULL," + \
            "`PollStationName` varchar(80) NOT NULL," + \
            "`VoidPoll` varchar(3) NOT NULL," + \
            "`NoPollHeld` varchar(3) NOT NULL," + \
            "`MergeWith` varchar(20) NOT NULL," + \
            "`RejectedBallots` int(11) NOT NULL," + \
            "`ElectorsCount` int(11) NOT NULL," + \
            "`CandidateLast` varchar(80) NOT NULL," + \
            "`CandidateMiddle` varchar(40) NOT NULL," + \
            "`CandidateFirst` varchar(40) NOT NULL," + \
            "`Party` varchar(80) NOT NULL," + \
            "`Incumbent` varchar(3) NOT NULL," + \
            "`Elected` varchar(3) NOT NULL," + \
            "`VoteCount` int(7) NOT NULL" + \
            ");"

    cursor.execute(strSQL)

def createSeatDistributionTable(cursor):

    strSQL = "CREATE TABLE IF NOT EXISTS `seat_distribution` (" + \
            "`ElectYear` int(4) NOT NULL," + \
            "`Party` varchar(40) NOT NULL," + \
            "`ActualSeats` int(5) NOT NULL," + \
            "`PRSeats` int(5) NOT NULL," + \
            "`VoteCount` int(8) NOT NULL" + \
            ")"

    cursor.execute(strSQL)




# -----------

for electYear in resultURLs:
    processElectionURL(electYear, resultURLs[electYear])

calcSeats()

