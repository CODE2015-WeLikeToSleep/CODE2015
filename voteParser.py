import os
import glob
import MySQLdb as mdb
from _mysql_exceptions import IntegrityError
import xml.etree.ElementTree as ET


def main():

    path = '../data/votes/'
    con = mdb.connect('localhost', 'test_user', 'mysqlpw', 'code')

    print(os.path.join(path, '*.xml'))
    for infile in glob.glob(os.path.join(path, '*.xml')):
        print "current file is: " + infile
        my_dict = parse_xml(infile)

        if my_dict is None:
            continue  # only care for votes related to bills

        # this depends on file path format not changing
        my_dict['parl_number'] = infile[18:20]
        my_dict['session_number'] = infile[25:26]
        my_dict['vote_number'] = infile[31:].replace('.xml', '')

        cur = con.cursor()
        try:
            cur.execute("INSERT INTO parliament_votes " +
                        "(parl_number, session_number, vote_number, " +
                        "bill_number, title, sponsor, decision, " +
                        "con_yes, con_no, con_paired, " +
                        "lib_yes, lib_no, lib_paired, " +
                        "ndp_yes, ndp_no, ndp_paired, " +
                        "bqc_yes, bqc_no, bqc_paired, " +
                        "grp_yes, grp_no, grp_paired, " +
                        "otr_yes, otr_no, otr_paired) " +
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, " +
                        "%s, %s, %s, %s, %s, %s, %s, %s, %s, " +
                        "%s, %s, %s, %s, %s, %s, %s, %s, %s)", (
                        my_dict['parl_number'], my_dict['session_number'],
                        my_dict['vote_number'],
                        my_dict['bill_number'], my_dict['title'],
                        my_dict['sponsor'], my_dict['decision'],
                        my_dict['votes']['con']['yes'],
                        my_dict['votes']['con']['no'],
                        my_dict['votes']['con']['paired'],
                        my_dict['votes']['lib']['yes'],
                        my_dict['votes']['lib']['no'],
                        my_dict['votes']['lib']['paired'],
                        my_dict['votes']['ndp']['yes'],
                        my_dict['votes']['ndp']['no'],
                        my_dict['votes']['ndp']['paired'],
                        my_dict['votes']['bqc']['yes'],
                        my_dict['votes']['bqc']['no'],
                        my_dict['votes']['bqc']['paired'],
                        my_dict['votes']['grp']['yes'],
                        my_dict['votes']['grp']['no'],
                        my_dict['votes']['grp']['paired'],
                        my_dict['votes']['otr']['yes'],
                        my_dict['votes']['otr']['no'],
                        my_dict['votes']['otr']['paired']))
        except IntegrityError:
            print('Duplicate entry? -- skipping')

    con.commit()
    con.close()


def parse_xml(xml_file):

    result = {}
    tree = ET.parse(xml_file)
    root = tree.getroot()

    result['bill_number'] = root.find('RelatedBill').get('number')
    if result['bill_number'] is '':  # only process votes related to bills
        return
    result['title'] = root.find('RelatedBill').find('Title').text.encode('ascii', 'ignore')
    result['sponsor'] = root.find('Sponsor').text.encode('ascii', 'ignore')
    result['decision'] = root.find('Decision').text.lower().encode('ascii', 'ignore')

    party_codes = {'conservative': 'con', 'liberal': 'lib', 'green party': 'grp', 'bloc qubcois': 'bqc',
                   'ndp': 'ndp'}
    votes = {'con': {'yes': 0, 'no': 0, 'paired': 0},
             'lib': {'yes': 0, 'no': 0, 'paired': 0},
             'ndp': {'yes': 0, 'no': 0, 'paired': 0},
             'bqc': {'yes': 0, 'no': 0, 'paired': 0},
             'grp': {'yes': 0, 'no': 0, 'paired': 0},
             'otr': {'yes': 0, 'no': 0, 'paired': 0}}
    for mp in root.findall('Participant'):
        party_name = mp.find('Party').text.lower().encode('ascii', 'ignore')
        party = party_codes.get(party_name)
        if party is None:
            party = 'otr'  # 'other'
        vote = mp.find('RecordedVote')
        votes[party]['yes'] += int(vote.find('Yea').text)
        votes[party]['no'] += int(vote.find('Nay').text)
        votes[party]['paired'] += int(vote.find('Paired').text)

    result['votes'] = votes
    return result

if __name__ == '__main__':
    main()
