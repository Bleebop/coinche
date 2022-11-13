const events = require('events');
const eventEmitter = new events.EventEmitter(); 

const suits = ['spades', 'hearts', 'clubs', 'diamonds'];
const trumps = ['spades', 'hearts', 'clubs', 'diamonds', 'no trump', 'all trump'];
const ranks = ['ace', '10', 'king', 'queen', 'jack', '9', '8', '7'];
const allowed_points = [80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 250];
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

class Game {
	constructor() {
		this.points = [0,0];
		this.stars = [0,0];
	}
}

class Contract {
	constructor(bidder, points, trump) {
		this.bidder = bidder;
		this.points = points;
		this.trump = trump;
	}
}

class Play {
	constructor(deck, dealer, players) {
		this.players = players;
		this.deck = deck;
		this.dealer = dealer;
		this.current_player = (dealer+1)%4;
		this.hands = [[],[],[],[]]
		let i = 0;
		let deal = deck.deal();
		for (var card of deal) {
			this.hands[Math.floor(i/8)].push(card);
			i += 1;
		}
		this.current_trick = [];
		this.play_history = {
			bids: [],
			coinches: [],
			cards: [],
			belotes: []
		}; 
		this.cards_won = [[],[]];
		this.n_belote = 0;
		this.dix_de_der = false;
		this.contract = new Contract(-1, 0, "");
		this.phase = 0;
		this.n_passes = -1;
		this.block = false;
	}
	
	reset_play() {
		this.hands = [[],[],[],[]]
		let i = 0;
		let deal = deck.deal();
		for (var card of deal) {
			this.hands[Math.floor(i/8)].push(card);
			i += 1;
		}
		this.current_trick = [];
		this.play_history = {
			bids: [],
			coinches: [],
			cards: [],
			belotes: []
		}; 
		this.cards_won = [[],[]];
		this.n_belote = 0;
		this.dix_de_der = false;
		this.contract = new Contract(-1, 0, "");
		this.phase = 0;
		this.n_passes = -1;
		this.block = false;
	}
	
	bid(proposed_contract) {
		if (this.block) {
			return false;
		}
		this.block = true;
		if (this.phase != 0) {
			this.block = false;
			return false;
		}
		if (proposed_contract.bidder != this.current_player) {
			this.block = false;
			return false;
		}
		if (proposed_contract.points === 0) {
			this.n_passes += 1;
			this.current_player = (this.current_player+1)%4
			if (this.n_passes > 2) {
				this.phase = 1;
				eventEmitter.emit('phase1');
			}
			this.block = false;
			return true;
		}
		if (!trumps.includes(proposed_contract.trump)) {
			this.block = false;
			return false;
		}
		if (!allowed_points.includes(proposed_contract.points)
				|| proposed_contract.points <= this.contract.points) {
			this.block = false;
			return false;
		}
		this.contract = proposed_contract;
		this.play_history.bids.push(proposed_contract);
		this.n_passes = 0;
		this.current_player = (this.current_player+1)%4;
		if (proposed_contract.points === 250) {
			this.phase = 1;
			eventEmitter.emit('phase1');
		}
		this.block = false;
		return true;
	}
	
	coinche(coincheur) {
		if (this.block) {
			return false;
		}
		this.block = true;
		if (this.phase != 0 && this.phase != 1) {
			this.block = false;
			return false;
		}
		if (this.contract.points === 0) {
			this.block = false;
			return false;
		}
		if (this.play_history.coinches.length) {
			this.block = false;
			return false;
		}
		if (!((coincheur+this.contract.bidder)%2)) {
			this.block = false;
			return false;
		}
		this.play_history.coinches.push(coincheur);
		this.phase = 2;
		eventEmitter.emit('phase2');
		this.block = false;
		return true;
	}
	
	surcoinche(coincheur) {
		if (this.block) {
			return false;
		}
		this.block = true;
		if (this.phase != 2) {
			this.block = false;
			return false;
		}
		if (this.contract.points === 0) {
			this.block = false;
			return false;
		}
		if (this.play_history.coinches.length != 1) {
			this.block = false;
			return false;
		}
		if ((coincheur+this.contract.bidder)%2) {
			this.block = false;
			return false;
		}
		this.play_history.coinches.push(coincheur);
		this.phase = 3;
		this.current_player = (this.dealer+1)%4;
		eventEmitter.emit('phase3');
		this.block = false;
		return true;
	}
	
	play_card(card_id, player, belote) {
		if (this.block) {
			return false;
		}
		this.block = true;
		if (this.phase != 3) {
			this.block = false;
			return false;
		}
		if (player != this.current_player) {
			this.block = false;
			return false;
		}
		if (this.current_trick.length >= 4) {
			this.block = false;
			return false;
		}
		let card = this.deck.cards.get(card_id);
		let cards_ok = allowed_cards(this.current_trick, this.contract.trump, this.hands[player]);
		if (!cards_ok.includes(card)) {
			this.block = false;
			return false;
		}
		if (belote === "belote") {
			let id_king = card.suit.slice(0,-1) + "_king";
			let id_queen = card.suit.slice(0,-1) + "_queen";
			if (this.hands[player].includes(this.deck.cards.get(id_king))
					&& this.hands[player].includes(this.deck.cards.get(id_queen))
					&& (card.id === id_king || card.id === id_queen)
					&& (player%2 === this.contract.bidder%2)) {
				if (this.contract.trump === "all trump"
						&& (this.current_trick.length === 0
							|| this.current_trick[0].suit === card.suit)) {
					this.play_history.belotes.push(card.id);
				} else if (card.suit === this.contract.trump) {
					this.play_history.belotes.push(card.id);
				} else {
					this.block = false;
					return false;
				}
			} else {
				this.block = false;
				return false;
			}
		} else if (belote === "rebelote") {
			let id_king = card.suit.slice(0,-1) + "_king";
			let id_queen = card.suit.slice(0,-1) + "_queen";
			if ((card.id === id_king && this.play_history.belotes.includes(id_queen))
					|| (card.id === id_queen && this.play_history.belotes.includes(id_king))) {
				if (this.contract.trump === "all trump"
						&& (this.current_trick.length === 0
							|| this.current_trick[0].suit === card.suit)) {
					this.play_history.belotes.push(card.id);
					this.n_belote += 1;
				} else if (card.suit === this.contract.trump) {
					this.play_history.belotes.push(card.id);
					this.n_belote += 1;
				} else {
					this.block = false;
					return false;
				}
			} else {
				this.block = false;
				return false;
			}
		}
		
		this.current_trick.push(card);
		this.play_history.cards.push(card);
		let index = this.hands[player].indexOf(card);
		this.hands[player].splice(index,1);
		if (this.current_trick.length < 4) {
			this.current_player = (player+1)%4;
		} else {
			this.current_player = trick_winner(this.current_trick, this.contract.trump, (player+1)%4);
			this.cards_won[this.current_player%2] = this.cards_won[this.current_player%2].concat(this.current_trick);
			this.current_trick = [];
		}
		if (this.play_history.cards.length === 32) {
			if (this.current_player%2 === this.contract.bidder%2) {
				this.dix_de_der = true;
			}
			this.phase = 4;
			eventEmitter.emit('phase4');
		}
		this.block = false;
		return true;
	}
	
	count_points() {
		let total = 0;
		for (var card of this.cards_won[this.contract.bidder%2]) {
			total += card.points(this.contract.trump);
		}
		if (this.contract.trump === "all trump") {
			total = total * (19/31);
		} else if (this.contract.trump === "no trump") {
			total = total * (19/15);
		}
		if (this.dix_de_der) {
			total += 10;
		}
		if (total >= 80) {
			total += this.n_belote*20;
		}
		return total
	}
	
	contract_won(total) {
		if (this.contract.points < 250) {
			return total >= this.contract.points;
		} else {
			return this.cards_won[this.contract.bidder%2].length === 32;
		}
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

    for (var i = arr.length - 1; i > 0; i -= 1) {
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
	for (var card of trick) {
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
	for (var card of trick) {
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



module.exports = {
	allowed_cards,
	trick_winner,
	belote_deck,
	suits,
	trumps,
	ranks,
	Play,
	Contract,
	eventEmitter
}

