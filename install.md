# CODE2015
Our project for CODE2015

- (On Mac/Linux) run download_parliament_votes.sh
  - create a folders called 'data/votes' and 'data/summaries' under the parent folder
  - move data files with name similar 'parlXX_sessX.xml' to data/summaries
  - move the other data files to data/votes

- Set up a MySQL database on localhost
  - Username: root
  - Password: code2015
  - Database: code2015
- run voteParser.py
- run sessionParser.py
- run PollResults.py

- Point your webserver vhost to this directory
- Browse to http://hostname/detail.html