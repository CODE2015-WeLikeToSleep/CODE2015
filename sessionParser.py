import os
import glob
import MySQLdb as mdb
from _mysql_exceptions import IntegrityError
import xml.etree.ElementTree as ET


def main():
    path = './data/summaries/'
    con = mdb.connect('localhost', 'root', 'code2015', 'code2015')

    print(os.path.join(path, '*.xml'))
    for infile in glob.glob(os.path.join(path, '*.xml')):
        print "current file is: " + infile
        records = parse_xml(infile)
        if records is None:
            continue

        cur = con.cursor()
        for record in records:
            try:
                cur.execute("INSERT INTO vote_summaries " +
                            "(parl_number, session_number, vote_number, " +
                            "date, decision, total_yes, total_no, total_paired) " +
                            "VALUES(%s, %s, %s, %s, %s, %s, %s, %s)", (
                            record['parl_number'], record['session_number'],
                            record['vote_number'], record['date'], record['decision'],
                            record['total_yes'], record['total_no'],
                            record['total_paired']))
            except IntegrityError:
                print('Duplicate entry? -- skipping')

    con.commit()
    con.close()


def parse_xml(xml_file):

    result = {}
    tree = ET.parse(xml_file)
    root = tree.getroot()

    result = []

    for vote in root.findall('Vote'):
        vote_data = {}
        vote_data['parl_number'] = vote.get('parliament')
        vote_data['session_number'] = vote.get('session')
        vote_data['vote_number'] = vote.get('number')
        vote_data['date'] = vote.get('date')
        vote_data['decision'] = vote.find('Decision').text
        vote_data['total_yes'] = vote.find('TotalYeas').text
        vote_data['total_no'] = vote.find('TotalNays').text
        vote_data['total_paired'] = vote.find('TotalPaired').text
        result.append(vote_data)
        print(vote_data)

    return result

if __name__ == '__main__':
    main()
