<?php
header('Content-Type: application/json; charset=UTF-8');

// TODO: get as input
if (!(isset($_GET["p"]) and isset($_GET["s"]) and isset($_GET["v"]))) {
    // FIX ME
}

$parliament = $_GET["p"];
$session = $_GET["s"];
$vote = $_GET["v"];

$mysqli = new mysqli("localhost", "root", "code2015", "code2015");

if ($mysqli->connect_errno) {
    echo "Failed to connect to MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error;
}

/* Prepared statement, stage 1: prepare */
if (!($stmt = $mysqli->prepare("SELECT s.date, p.bill_number, p.title, p.decision, p.con_yes, p.con_no, p.con_paired, " .
                               "p.lib_yes, p.lib_no, p.lib_paired, p.ndp_yes, p.ndp_no, p.ndp_paired, " .
                               "p.bqc_yes, p.bqc_no, p.bqc_paired, p.grp_yes, p.grp_no, p.grp_paired, " .
                               "p.otr_yes, p.otr_no, p.otr_paired" .
                               " FROM parliament_votes p, vote_summaries s" .
                               " WHERE p.parl_number=? AND p.session_number=? AND p.vote_number=?" .
                               " AND p.parl_number=s.parl_number AND p.session_number=s.session_number " .
                               "AND p.vote_number=s.vote_number"))) {
    echo "Prepare failed: (" . $mysqli->errno . ") " . $mysqli->error;
}

if (!$stmt->bind_param("sss", $parliament, $session, $vote)) {
    echo "Binding parameters failed: (" . $stmt->errno . ") " . $stmt->error;
}

if (!$stmt->execute()) {
    echo "Execute failed: (" . $stmt->errno . ") " . $stmt->error;
}

$stmt->bind_result($date, $bill, $title, $decision, $con_yes, $con_no, $con_paired, $lib_yes, $lib_no, $lib_paired,
                   $ndp_yes, $ndp_no, $ndp_paired, $bqc_yes, $bqc_no, $bqc_paired, $grp_yes,
                   $grp_no, $grp_paired, $otr_yes, $otr_no, $otr_paired);

$json = "";
while ($stmt->fetch()) {
    $json = json_encode(['parliament' => $parliament,
                         'session' => $session,
                         'vote' => $vote,
                         'date' => $date,
                         'bill' => $bill,
                         'title' => $title,
                         'decision' => $decision,
                         'details' => [['party' => 'conservative', 'yea' => $con_yes, 'nay'=> $con_no],
                                       ['party' => 'liberal', 'yea' => $lib_yes, 'nay'=> $lib_no],
                                       ['party' => 'ndp', 'yea' => $ndp_yes, 'nay'=> $ndp_no],
                                       ['party' => 'bloc quebecois', 'yea' => $bqc_yes, 'nay'=> $bqc_no],
                                       ['party' => 'green party', 'yea' => $grp_yes, 'nay'=> $grp_no],
                                       ['party' => 'other', 'yea' => $otr_yes, 'nay'=> $otr_no]]]);
    echo $json;
}

return $json;
