USE code

DROP TABLE IF EXISTS parliament_votes;
DROP TABLE IF EXISTS vote_summaries;

CREATE TABLE vote_summaries (
    parl_number INT NOT NULL,
    session_number INT NOT NULL,
    vote_number INT NOT NULL,
    date DATE NOT NULL,
    decision VARCHAR(20) NOT NULL,
    total_yes INT NOT NULL DEFAULT 0,
    total_no INT NOT NULL DEFAULT 0,
    total_paired INT NOT NULL DEFAULT 0,
    PRIMARY KEY (parl_number, session_number,vote_number)
) ENGINE=INNODB;

CREATE TABLE parliament_votes (
    parl_number INT NOT NULL,
    session_number INT NOT NULL,
    vote_number INT NOT NULL,
    bill_number VARCHAR(10) NOT NULL,
    title TEXT NOT NULL,
    sponsor VARCHAR(500) NOT NULL,
    decision VARCHAR(20) NOT NULL,
    con_yes INT NOT NULL DEFAULT 0,
    con_no INT NOT NULL DEFAULT 0,
    con_paired INT NOT NULL DEFAULT 0,
    lib_yes INT NOT NULL DEFAULT 0,
    lib_no INT NOT NULL DEFAULT 0,
    lib_paired INT NOT NULL DEFAULT 0,
    ndp_yes INT NOT NULL DEFAULT 0,
    ndp_no INT NOT NULL DEFAULT 0,
    ndp_paired INT NOT NULL DEFAULT 0,
    bqc_yes INT NOT NULL DEFAULT 0,
    bqc_no INT NOT NULL DEFAULT 0,
    bqc_paired INT NOT NULL DEFAULT 0,
    grp_yes INT NOT NULL DEFAULT 0,
    grp_no INT NOT NULL DEFAULT 0,
    grp_paired INT NOT NULL DEFAULT 0,
    otr_yes INT NOT NULL DEFAULT 0,
    otr_no INT NOT NULL DEFAULT 0,
    otr_paired INT NOT NULL DEFAULT 0,
    PRIMARY KEY (parl_number, session_number,vote_number)
) ENGINE=INNODB;