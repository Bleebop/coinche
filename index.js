const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const events = require('events');
const coinche = require("./coinche_rules_server.js");
const ai = require("./coinche_ai.js");

app.use(express.static('public'))

const deck = coinche.belote_deck;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const ai_bid_delay = 5000;
const ai_card_delay = 2000;
const coinche_delay = 5000;
const surcoinche_delay = 5000;
let play;


coinche.eventEmitter.on('bid', (contract) => {
	try_contract(play, contract);
});
coinche.eventEmitter.on('coinche', (player) => {
	try_coinche(play, player);
});
coinche.eventEmitter.on('surcoinche', (player) => {
	try_surcoinche(play, player);
});
coinche.eventEmitter.on('card played', (card_play) => {
	try_card(play, card_play);
});

coinche.eventEmitter.on('bid accepted', () => {
	wait_ai_coinche(play);
	coinche.eventEmitter.emit('next turn');
});
coinche.eventEmitter.on('phase1', () => {
	wait_ai_coinche(play);
	setTimeout(end_coinche, coinche_delay, play);
});
coinche.eventEmitter.on('phase2', () => {
	wait_ai_surcoinche(play);
	setTimeout(end_surcoinche, surcoinche_delay, play);
});
coinche.eventEmitter.on('phase3', () => {
	io.emit('contract', play.contract);
	coinche.eventEmitter.emit('next turn');
});

coinche.eventEmitter.on('card accepted', () => {
	coinche.eventEmitter.emit('next turn');
});
coinche.eventEmitter.on('next turn', () => {
	if (play.phase === 0) {
		setTimeout(wait_ai_bid, ai_bid_delay, play);
	} else if (play.phase === 3) {
		setTimeout(wait_ai_card, ai_card_delay, play);
	}
});
	
coinche.eventEmitter.on('phase4', () => {
	setTimeout(end_game, ai_card_delay, play);
});
	
coinche.eventEmitter.on('phase5', () => {
	setTimeout(cancel_game, ai_bid_delay);
});

const rooms = new Map();

io.on('connection', (socket) => {
	console.log('a user connected');
  
	socket.on('launch game', (n_player) => {
		//socket.join("room test");
		let players = [];
		if (n_player) {
			players = [new ai.human_player(0, socket.id),
					   new ai.random_player(1),
					   new ai.random_player(2),
					   new ai.random_player(3)];
		} else {
			players = [new ai.random_player(0),
					   new ai.random_player(1),
					   new ai.random_player(2),
					   new ai.random_player(3)];
		}
		let dealer = Math.floor(4 * Math.random());
		//let dealer = 3;
		//rooms.set("room test", new coinche.Play(deck, dealer, players));
		play = new coinche.Play(deck, dealer, players);
		
		if (n_player) {
			for (player of players) {
				if (!player.is_ai) {
					let player_hand = play.hands[player.position];
					io.to(player.socketId).emit('hand', player_hand.map(card => card.id), dealer);
				}
			}
		} else {
			let hands_id = play.hands.map(hand => hand.map(card => card.id));
			io.emit('hands', hands_id, dealer);
		}
		
		coinche.eventEmitter.emit('next turn');
	});
	
	socket.on('bid', (contract) => {
		try_contract(play, contract);
	});
	socket.on('coinche', (player) => {
		try_coinche(play, player);
	});
	socket.on('surcoinche', (player) => {
		try_surcoinche(play, player);
	});
	socket.on('card played', (card_play) => {
		try_card(play, card_play);
	});
	
	socket.onAny((eventName, args) => {
		console.log("received:", eventName, args);
	});
	
	socket.on('ping', () => {
		console.log(play);
	});
	
	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

function try_contract(play, contract) {
	if (play.bid(contract)) {
		io.emit('bid accepted', contract, play.current_player);
		coinche.eventEmitter.emit('bid accepted');
	}
}
function try_coinche(play, player) {
	if (play.coinche(player)) {
		io.emit('coinche accepted', player);
		coinche.eventEmitter.emit('coinche accepted');
	}
}
function try_surcoinche(play, player) {
	if (play.surcoinche(player)) {
		io.emit('surcoinche accepted', player);
		coinche.eventEmitter.emit('surcoinche accepted');
	}
}
function try_card(play, card_play) {
	if (play.play_card(...card_play)) {
		io.emit('card accepted', card_play, play.current_player);
		coinche.eventEmitter.emit('card accepted');
	}
}
function end_coinche(play) {
	console.log('end coinche');
	if (play.play_history.coinches.length === 0) {
		play.phase = 3;
		play.current_player = (play.dealer+1)%4;
		coinche.eventEmitter.emit('phase3');
	}
}
function end_surcoinche(play) {
	console.log('end surcoinche');
	play.phase = 3;
	play.current_player = (play.dealer+1)%4;
	coinche.eventEmitter.emit('phase3');
}

function end_game(play) {
	let total = play.count_points();
	let tricks_taken = play.cards_won[play.contract.bidder%2].length/4;
	io.emit('end play', total, play.contract_won(total), tricks_taken);
}

function cancel_game() {
	io.emit('cancel play');
}


function wait_ai_bid(play) {
	let curr_player = play.players[play.current_player];
	if (curr_player.is_ai && play.phase === 0) {
		let ai_bid = curr_player.ai_bid(play.play_history);
		coinche.eventEmitter.emit('bid', ai_bid);
	}
}
function wait_ai_coinche(play) {
	for (player of play.players) {
		if ((play.coinche === 0) && player.is_ai && (play.phase === 0 || play.phase === 1)
				&& ((play.contract.bidder+player.position)%2 === 1)) {
			if (player.ai_coinche) {
				coinche.eventEmitter.emit('coinche', player.position);
			}
		}
	}
}
function wait_ai_surcoinche(play) {
	for (player of play.players) {
		if ((play.coinche === 1) && player.is_ai && play.phase === 2
				&& ((play.contract.bidder+player.position)%2 === 0)) {
			if (player.ai_surcoinche) {
				coinche.eventEmitter.emit('surcoinche', player.position);
			}
		}
	}
}
function wait_ai_card(play) {
	let curr_player = play.players[play.current_player];
	if (curr_player.is_ai && play.phase === 3) {
		let ai_card_play = curr_player.ai_play(play.current_trick, play.contract, play.hands[curr_player.position], play.play_history);
		coinche.eventEmitter.emit('card played', ai_card_play);
	}
}

