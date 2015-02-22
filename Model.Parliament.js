// TODO: show what 'influence' looks like

ElectoralMethod = Object.freeze({
	FPTP: 'fptp', // First Past The Post ("normal")
	PR: 'pr', // Proportional Representation, simplified
});

function Parliament() {
	this.parties = {}; // each party hash has "seats" and "influence"
}

/**
 * Augment a parliament object with ratio calculations.
 * @param {Parliament} parliament
 * @return {Parliament} parliament
 */
Parliament.prototype.appendRatios = function appendParliamentRatios(parliament) {
	var self = this;
	var totalSeats = 0;
	var goodParties = [];
	for (party in this.parties) {
		var seats = this.parties[party]['seats'];
		if (seats >= 0) {
			totalSeats += seats;
		} else {
			console.log('TODO: How do I throw a NaN exception?');
			continue;
		}
		goodParties.push(party);
	}
	goodParties.forEach(function(value,ix,array){
		var party = value;
		self.parties[party]['influence'] = self.parties[party]['seats'] / totalSeats;
	});
}

function fetchParliamentByNumber(method, parliament, callback) {
	var parlYears = {
		'41': 2011,
		'40': 2009,
		'39': 2006
	};
	fetchParliamentByYear(method, parlYears[parliament], callback);
}

function fetchParliamentByYear(method, year, callback) {
	// TODO: validation on the year (only some years are valid, like 2008)
	var electionDataResource = 'electiondata.php';

	// FIXME: this is the worst hack.
	var partyNameTransform = {
		'Conservative': 'conservative',
		'Liberal': 'liberal',
		'NDP-New Democratic Party': 'ndp',
		'Bloc Quebecois': 'bloc quebecois',
		'Green Party': 'green party',
		'other': 'other',
	};

	var self = this;
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: electionDataResource + '?y=' + year,
		success: function(dataJSON){
			var parliament = new Parliament();
			dataJSON.forEach(function(value,ix,array){
				if (typeof partyNameTransform[value.party] == "undefined") {
					return; // just skip parties we don't care about.
				}
				var partyName = partyNameTransform[value.party];
				var allMethodResults = {};
				allMethodResults[ElectoralMethod.FPTP] = value.fptp;
				allMethodResults[ElectoralMethod.PR] = value.pr;
				parliament.parties.push({
					party: partyName,
					seats: allMethodResults[method]
				});
			});
			callback(parliament);
		}
	})
}