const suits = ['spades', 'hearts', 'clubs', 'diamonds'];
const trumps = ['spades', 'hearts', 'clubs', 'diamonds', 'no trump', 'all trump'];
const ranks = ['ace', '10', 'king', 'queen', 'jack', '9', '8', '7'];
const points_trump = new Map([
	['7', 0],
	['8', 0],
	['queen', 3],
	['king', 4],
	['10', 10],
	['ace', 11],
	['9', 14],
	['jack', 20]
]);
const points_not_trump = new Map([
	['7', 0],
	['8', 0],
	['9', 0],
	['jack', 2],
	['queen', 3],
	['king', 4],
	['10', 10],
	['ace', 11]
]);
const order_trump = new Map([
	['7', 0],
	['8', 1],
	['queen', 2],
	['king', 3],
	['10', 4],
	['ace', 5],
	['9', 6],
	['jack', 7]
]);
const order_not_trump = new Map([
	['7', 0],
	['8', 1],
	['9', 2],
	['jack', 3],
	['queen', 4],
	['king', 5],
	['10', 6],
	['ace', 7]
]);

class Contract {
	constructor(bidder, points, trump) {
		this.bidder = bidder;
		this.points = points;
		this.trump = trump;
	}
}

class Card {
	constructor(suit, rank) {
		this.suit = suit;
		this.rank = rank;
		this.id = suit.slice(0,-1) + "_" + rank;
	}
	
	points(trump) {
		if (trump === 'all trump' || trump === this.suit) {
			return points_trump.get(this.rank);
		} else {
			return points_not_trump.get(this.rank);
		}
	}
	
	order(trump) {
		if (trump === 'all trump' || trump === this.suit) {
			return order_trump.get(this.rank);
		} else {
			return order_not_trump.get(this.rank);
		}
	}
}

class Deck {
	constructor(suits, ranks) {
		this.suits = suits;
		this.ranks = ranks;
		let cards = new Map();
		for (var suit of suits) {
			for (var rank of ranks) {
				let card_id = suit.slice(0,-1) + "_" + rank;
				cards.set(card_id, new Card(suit, rank));
			}
		}
		this.cards = cards;
	}
	
	deal() {
		let hands = Array.from(this.cards.values());
		shuffle(hands);
		return hands;
	}
}

const belote_deck = new Deck(suits, ranks);

function shuffle(arr) {
	var rand, temp, i;

    for (i = arr.length - 1; i > 0; i -= 1) {
        rand = Math.floor((i + 1) * Math.random());
        temp = arr[rand];
        arr[rand] = arr[i];
        arr[i] = temp;
    }
    return arr;
}

function best_trump(trick, trump) {
	var winner = -1;
	var best_rank = -1;
	var i = 0;
	for (card of trick) {
		if (card.suit === trump) {
			if (card.order(trump) > best_rank) {
				winner = i;
				best_rank = card.order(trump);
			}
		}
		i += 1;
	}
	return [winner, best_rank];
}

function best_suit(trick) {
	const dominant_suit = trick[0].suit;
	var winner = -1;
	var best_rank = -1;
	var i = 0;
	for (card of trick) {
		if (card.suit === dominant_suit) {
			if (card.order('no trump') > best_rank) {
				winner = i;
				best_rank = card.order('no trump');
			}
		}
		i += 1;
	}
	return winner;
}

function trick_winner(trick, trump, first) {
	const suits_played = new Set(trick.map(card => card.suit));
	let winner;
	let rank;
	if (suits_played.has(trump)) {
		[winner, rank] = best_trump(trick, trump);
	} else if (trump === 'all trump') {
		[winner, rank] = best_trump(trick, trick[0].suit);
	} else {
		winner = best_suit(trick);
	}
	return (first+winner)%4;
}

function allowed_cards(trick, trump, hand) {
	if (!trick.length) {
		return hand;
	}
	const suits_in_hand = new Set(hand.map(card => card.suit));
	const dominant_suit = trick[0].suit;
	if (suits_in_hand.has(dominant_suit)) {
		const cards_ok = hand.filter(card => card.suit===dominant_suit);
		if (!(dominant_suit === trump || trump === 'all trump')) {
			return cards_ok;
		} else {  // dominant suit is (one of) the trump
			const [winner, best_rank] = best_trump(trick, dominant_suit);
			const trumps_ok = cards_ok.filter(card => card.order(dominant_suit)>best_rank);
			if (trumps_ok.length) {  // only better trumps can be played if they exist
				return trumps_ok;
			} else {
				return cards_ok;
			}
		}
	} else {  // no card of the dominant suit in hand
		if (!suits_in_hand.has(trump)) {
			return hand;
		} else {  // we have trumps in hand
			const suits_in_trick = new Set(trick.map(card => card.suit));
			let best_rank = -1;
			let winner;
			if (suits_in_trick.has(trump)) {
				[winner, best_rank] = best_trump(trick, trump);
			}
			const hand_wo_trumps = hand.filter(card => card.suit!=trump);
			const hand_trumps = hand.filter(card => card.suit===trump);
			let hand_trumps_ok = hand_trumps.filter(card => card.order(trump)>best_rank);
			if (!hand_trumps_ok.length) {
				hand_trumps_ok = hand_trumps;
			}
			if (trick_winner(trick, trump, 0) === trick.length-2) {
				// the partner is winning the trick
				return hand_wo_trumps.concat(hand_trumps_ok);
			} else {  // the partner isn't winning the trick
				return hand_trumps_ok;
			}
		}
	}
}

function belote_possible(hand, card_id, in_bidder_team, trump, current_trick, game_history) {
	let card_suit = card_id.split("_")[0]+"s";
	let id_king = card_suit.slice(0,-1) + "_king";
	let id_queen = card_suit.slice(0,-1) + "_queen";
	if (hand.includes(id_king) && hand.includes(id_queen)
			&& (card_id === id_king || card_id === id_queen) && (in_bidder_team)) {
		if ((current_trick.length === 0 || current_trick[0].split("_")[0] === card_suit)
					&& trump === "all trump") {
			return "belote";
		} else if (card_suit === trump) {
			return "belote";
		} else {
			return ""
		}
	} else if ((card_id === id_king && game_history.belotes.includes(id_queen))
			|| (card_id === id_queen && game_history.belotes.includes(id_king))) {
		if ((current_trick.length === 0 || current_trick[0].split("_")[0]+"s" === card_suit)
				&& trump === "all trump") {
			return "rebelote";
		} else if (card_suit === this.contract.trump) {
			return "rebelote";
		} else {
			return ""
		}
	}
	return ""
}
