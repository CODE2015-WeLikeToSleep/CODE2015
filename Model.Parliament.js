// TODO: show what 'influence' looks like

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
		if (seats > 0) {
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