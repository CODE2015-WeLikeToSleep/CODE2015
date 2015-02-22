// An enumeration of yay/nay/pair
VoteType = Object.freeze({
	YEA:  'YEA',
	PAIR: 'PAIR',
	NAY:  'NAY'
});

/**
 * These are used to populate chamber vote detail
 */
function PartyVoteCount(p, t, c) {
	if (typeof c == "undefined") {console.log('missing parameter');}
	this.party = p;
	this.voteType = t;
	this.count = c;
}

/**
 * Modelled after results from
 * http://www.parl.gc.ca/HouseChamberBusiness/Chambervotedetail.aspx
 * 
 * We only care about the per-party distribution of votes, so we aggregate
 * the voting data as soon as possible and throw away per-member details.
 * This is because our hypothetical alternate parliament is based on
 * party membership, not individuals.
 *
 * Awkwardly, the data we want is a combination of that found from two sources,
 * if we're modelling a real result. Less of a concern for made-up results.
 * 
 * Generally you want to populate partyVotes{} soon after creating an object.
 */
function ChamberVoteDetail(p, s, v) {
	this.nthParliament = p;
	this.nthSession = s;
	this.nthVote = v;
	this.sitting = '';
	this.date = '';
	this.bill = '';
	this.decision = '';
	this.sponsor = '';
	this.description = '';
	this.hypothetical = false;
	this.votes = []; // array of PartyVoteCount
	// Per-member voting details are intentionally omitted
}

ChamberVoteDetail.prototype.fetchAsync = function(callback) {
	var self = this;
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: 'votedata.php?p='+this.nthParliament+'&s='+this.nthSession+'&v='+this.nthVote,
		success: function(dataJSON){
			self.decision = dataJSON.decision;
			self.date = dataJSON.date;
			self.description = dataJSON.title;
			dataJSON.details.forEach(function(value,ix,array){
				self.votes.push(new PartyVoteCount(value.party,VoteType.YEA,value['yea']));
				self.votes.push(new PartyVoteCount(value.party,VoteType.NAY,value['nay']));
			});
			callback(self);
		}
	})
}

/**
 * Download the specifics of this chamber vote.
 * @param callback - takes one parameter, is the produced object
 * TODO: use MySQL backing instead of XML document.
 */
ChamberVoteDetail.prototype.fetchXmlAsync = function(callback) {
	var self = this;
	$.ajax({
		type: 'GET',
		url: 'data/parl'+this.nthParliament+'_sess'+this.nthSession+'_vote'+this.nthVote+'.xml',
		success : function(dataXML){
			$(dataXML).find('Vote').each(function(){
				this.sponsor = $(this).find('Sponsor').text();
				this.decision = $(this).find('Decision').text();
				this.bill = $(this).find('RelatedBill').attr('number');

				var tally = {};
				tally[VoteType.YEA] = {};
				tally[VoteType.NAY] = {};
				tally[VoteType.PAIR] = {};

				$(this).find('Participant').each(function(){
					var party = $(this).find("Party").text();

					// ensure the counts are initialized
					tally[VoteType.YEA][party] = tally[VoteType.YEA][party] || 0;
					tally[VoteType.NAY][party] = tally[VoteType.NAY][party] || 0;
					tally[VoteType.PAIR][party] = tally[VoteType.PAIR][party] || 0;

					// increment the counts with numbers from the XML
					tally[VoteType.YEA][party] += Number($(this).find("RecordedVote").find("Yea").text());
					tally[VoteType.NAY][party] += Number($(this).find("RecordedVote").find("Nay").text());
					tally[VoteType.PAIR][party] += Number($(this).find("RecordedVote").find("Paired").text());
				});

				self.votes.length = 0;
				for (type in tally) {
					typeResults = tally[type];
					for (party in typeResults) {
						self.votes.push(new PartyVoteCount(party,type,tally[type][party]));
					}
				}
				callback(self);
			});
		},
		error : function(){
			//error handler..
		}
	});	
}

/**
 * Derive a new per-party voting outcome based on a hypothetical alternate parliament.
 * @param {Parliament}
 */
ChamberVoteDetail.prototype.newScaledVote = function(altParliament) {
	// Calculate membership of the point-in-time parliament based on counted votes
	var actualParliament = this.getParliamentToday();

	altParliament.appendRatios();
	actualParliament.appendRatios(); // TODO: it's really awkward remembering to do this

	var newVote = new ChamberVoteDetail(this.nthParliament, this.nthSession, this.nthVote);
	newVote.bill = this.bill;
	newVote.hypothetical = true;

	this.votes.forEach(function(value,ix,array){
		var party = value.party;
		if (typeof altParliament.parties[party] == 'undefined') {
			console.log("Party gap mismatch " + party);
			return;
		}
		var scaleFactor = altParliament.parties[party]['influence'] / actualParliament.parties[party]['influence'];
		var adjustedCount = Math.round(value.count * scaleFactor);
		//console.log(altParliament.parties[party]);
		newVote.votes.push(new PartyVoteCount(value.party, value.voteType, adjustedCount));
	});
	return newVote;
}

/**
 * Realize that the members who participate in any given vote effectively
 * make up an instance of parliament. So you can apply the same treatment to the
 * effective parliament of a given day as you would to the elected parliament.
 * @param {VotesByParty} voteSummary
 * @return {Parliament}
 */
ChamberVoteDetail.prototype.getParliamentToday = function() {
	var self = this;
	var parliament = new Parliament();
	this.parties().forEach(function(value,ix,array){
		parliament.parties[value] = {party: value, seats: self.sumVotesByParty(value)};
	});
	return parliament;
}

/**
 * Sometimes you just want to put a vote summary on the console.
 * @param {VotesByParty} VotesByParty
 */
ChamberVoteDetail.prototype.prettyPrint = function() {
	var yea = this.sumVotes(VoteType.YEA);
	var nay = this.sumVotes(VoteType.NAY);
	console.log(yea+" yay. "+nay+" nay. ("+(yea+nay)+" total)");
};

// TODO: extract the reading (eg. 2nd, 3rd) from the description text
//ChamberVoteDetail.prototype.reading = function() {};

/**
 * Sum votes by type
 * @param {VoteType} t
 */
ChamberVoteDetail.prototype.sumVotes = function(t) {
	var sum = 0;
	this.votes.forEach(function(value,ix,array){
		if (value.voteType == t) {
			sum += value.count;
		}
	})
	return sum;
};

/**
 * Sum votes by type
 * @param {VoteType} t
 */
ChamberVoteDetail.prototype.sumVotesByParty = function(p) {
	var sum = 0;
	this.votes.forEach(function(value,ix,array){
		if (value.party == p) {
			sum += value.count;
		}
	})
	return sum;
};

/**
 * Sum votes by type
 * @param {VoteType} t
 */
ChamberVoteDetail.prototype.parties = function() {
	var partySet = {};
	this.votes.forEach(function(value,ix,array){
		partySet[value.party] = true;
	})
	return Object.keys(partySet);
};