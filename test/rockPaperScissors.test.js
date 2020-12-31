//B9lab ETH-SUB Ethereum Developer Subscription Course
//>>> RockPaperScissors <<< - Test file
//
//Last update: 31.12.2020

const RockPaperScissors = artifacts.require("RockPaperScissors");
const truffleAssert = require("truffle-assertions");
const { toBN } = web3.utils;

contract("RockPaperScissors", async (accounts) => {

    const [owner, player1, player2, attacker] = accounts;
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const contractState = {
        paused: 0,
        running: 1,
        destroyed: 2,
    };

    const Symbol = {
        none: 0,
        rock: 1,
        paper: 2,
        scissors: 3
    };
    const gameOutcome = {
        draw: 0,
        player1: 1,
        player2: 2,
    };
    const Status = {
        open: 0,
        started: 1,
        participated: 2,
        ended: 3,
    }

    const clearPassword = "passwordDummy";
    const hexClearPassword = web3.utils.asciiToHex(clearPassword);

    const emptyPassword = "";
    const hexEmptyPassword = web3.utils.asciiToHex(emptyPassword);

    const useMsgValue = false;
    const usePlayerStake = true;


    before("should be five accounts available: ", async () => {
        console.log("\n    There are five accounts available:");
        for(let i=0; i<5; i++){
            console.log(`\t#${i}: ${accounts[i]}`);
        }
        console.log("\n");
    });

    describe("constructor()", async () => {

        it("should not be possible to start RockPaperScissors as 'destroyed'", async () => {
            await truffleAssert.reverts(
                RockPaperScissors.new(
                    contractState.destroyed,
                    {from: owner}
                ),
                "Stoppable: Initial contract state can be 0 (paused) or 1 (running)"
            );
        });

        it("should not be possible to send value to constructor", async () => {
            await truffleAssert.reverts(
                RockPaperScissors.new(
                    contractState.running,
                    {from: owner, value: 1}
                )
            );
        });

        it("should be possible to start RockPaperScissors as 'paused'", async () => {
            const instance = await RockPaperScissors.new(
                contractState.paused,
                {from: owner}
            );

            const _state = await instance.getState({from: player1});
            assert.strictEqual(_state.toNumber(), contractState.paused, "contract could not set to paused");
        });

        it("should be possible to start RockPaperScissors as 'running'", async () => {
            const instance = await RockPaperScissors.new(
                contractState.running,
                {from: owner}
            );

            const _state = await instance.getState({from: player1});
            assert.strictEqual(_state.toNumber(), contractState.running, "contract could not set to running");
        });

        it("game outcomes should be stored correctly", async () => {
            const instance = await RockPaperScissors.new(
                contractState.running,
                {from: owner}
            );

            var outcome;

            //Player1: rock, Player2: rock
            outcome = await instance.gameOutcomes(Symbol.rock, Symbol.rock);
            assert.strictEqual(outcome.toNumber(), gameOutcome.draw, "outcome was not saved correctly");
            //Player1: paper, Player2: paper
            outcome = await instance.gameOutcomes(Symbol.paper, Symbol.paper);
            assert.strictEqual(outcome.toNumber(), gameOutcome.draw, "outcome was not saved correctly");
            //Player1: scissors, Player2: scissors
            outcome = await instance.gameOutcomes(Symbol.scissors, Symbol.scissors);
            assert.strictEqual(outcome.toNumber(), gameOutcome.draw, "outcome was not saved correctly");

            //Player1: rock, Player2: paper
            outcome = await instance.gameOutcomes(Symbol.rock, Symbol.paper);
            assert.strictEqual(outcome.toNumber(), gameOutcome.player2, "outcome was not saved correctly");
            //Player1: rock, Player2: scissors
            outcome = await instance.gameOutcomes(Symbol.rock, Symbol.scissors);
            assert.strictEqual(outcome.toNumber(), gameOutcome.player1, "outcome was not saved correctly");
            //Player1: paper, Player2: rock
            outcome = await instance.gameOutcomes(Symbol.paper, Symbol.rock);
            assert.strictEqual(outcome.toNumber(), gameOutcome.player1, "outcome was not saved correctly");
            //Player1: paper, Player2: scissors
            outcome = await instance.gameOutcomes(Symbol.paper, Symbol.scissors);
            assert.strictEqual(outcome.toNumber(), gameOutcome.player2, "outcome was not saved correctly");
            //Player1: scissors, Player2: rock
            outcome = await instance.gameOutcomes(Symbol.scissors, Symbol.rock);
            assert.strictEqual(outcome.toNumber(), gameOutcome.player2, "outcome was not saved correctly");
            //Player1: scissors, Player2: paper
            outcome = await instance.gameOutcomes(Symbol.scissors, Symbol.paper);
            assert.strictEqual(outcome.toNumber(), gameOutcome.player1, "outcome was not saved correctly");
        });
    });

    describe("function createGameHash()", async () => {
        let instance = null;

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running,
                {from: owner}
            );
        });

        it("should not be possible to create a game hash with an invalid 'bet'", async () => {
            await truffleAssert.reverts(
                instance.createGameHash(0, hexClearPassword, {from: player1}),
                "Bet is invalid. Select 'Rock', 'Paper' or 'Scissors'!"
            );

            await truffleAssert.fails(
                instance.createGameHash(4, hexClearPassword, {from: player1}),
                truffleAssert.ErrorType.INVALID_OPCODE
            );
        });

        it("should not be possible to create a game hash without providing 'purePassword'", async () => {
            await truffleAssert.reverts(
                instance.createGameHash(Symbol.rock, hexEmptyPassword, {from: player1}),
                "purePassword has to be provided"
            );
        });

        it("game hash should match with soliditySha3", async () => {
            gameHash = web3.utils.soliditySha3(
                {t: 'uint8',  v: Symbol.rock},
                {t: 'bytes32', v: hexClearPassword},
                {t: 'address', v: player1},
                {t: 'address', v: instance.address},
            );
            const _gameHash = await instance.createGameHash(Symbol.rock, hexClearPassword, {from: player1});

            assert.strictEqual(_gameHash, gameHash, "gameHash does not match");
        });
    });

    describe("function startGame()", async () => {
        let instance = null;
        let gameHash = null;
        const gameStake = '1000';

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running,
                {from: owner}
            );
            gameHash = await instance.createGameHash(Symbol.rock, hexClearPassword, {from: player1});
        });

        it("should not be possible to start a game when contract is paused", async () => {
            await instance.pauseContract({from: owner});

            await truffleAssert.reverts(
                instance.startGame(gameHash, player2, useMsgValue, {from: player1, value: gameStake}),
                "Stoppable: Contract is not running"
            );
        });

        it("should not be possible to start a game without providing 'gameHash'", async () => {
            await truffleAssert.reverts(
                instance.startGame(hexEmptyPassword, player2, useMsgValue, {from: player1, value: gameStake}),
                "gameHash has to be provided"
            );
        });

        it("should not be possible to start a game without providing 'opponent'", async () => {
            await truffleAssert.reverts(
                instance.startGame(gameHash, zeroAddress, useMsgValue, {from: player1, value: gameStake}),
                "Bad opponent"
            );
        });

        it("should not be possible to start a game with the same gameHash", async () => {
            await instance.startGame(gameHash, player2, useMsgValue, {from: player1, value: gameStake});

            await truffleAssert.reverts(
                instance.startGame(gameHash, player2, useMsgValue, {from: player1, value: gameStake}),
                "Game must be unique"
            );
        });

        it("should be possible to start a game by player1 with msg.value", async () => {
            const returned = await instance.startGame.call(gameHash, player2, useMsgValue, {from: player1, value: gameStake});
            assert.strictEqual(returned, true, "game cannot be started by player1");

            const contractBalanceBefore = await web3.eth.getBalance(instance.address);
            assert.strictEqual(contractBalanceBefore.toString(10), '0', "contracts balance is not correct");

            const txObj = await instance.startGame(gameHash, player2, useMsgValue, {from: player1, value: gameStake});
            truffleAssert.eventEmitted(txObj, "LogGameStarted");

            const logGameHash       = txObj.receipt.logs[0].args.gameHash;
            const logSender         = txObj.receipt.logs[0].args.player1;
            const logOpponent       = txObj.receipt.logs[0].args.player2;
            const logGameStake      = txObj.receipt.logs[0].args.gameStake;
            const logUsePlayerStake = txObj.receipt.logs[0].args.usePlayerStake;
            assert.strictEqual(logGameHash, gameHash, "gameHash was not logged correctly");
            assert.strictEqual(logSender, player1, "msg.sender was not logged correctly");
            assert.strictEqual(logOpponent, player2, "opponent was not logged correctly");
            assert.strictEqual(logGameStake.toString(10), gameStake, "gameStake was not logged correctly");
            assert.strictEqual(logUsePlayerStake, useMsgValue, "usePlayerStake was not logged correctly");

            const contractBalanceAfter = await web3.eth.getBalance(instance.address);
            assert.strictEqual(contractBalanceAfter.toString(10), gameStake, "contracts balance is not correct");

            const game = await instance.games(gameHash);
            assert.strictEqual(game.player1, player1, "player1 was not stored correctly");
            assert.strictEqual(game.player2, player2, "player2 was not stored correctly");
            assert.strictEqual(game.stake.toString(10), gameStake, "gameStake was not stored correctly");
            assert.strictEqual(game.bet2.toString(10), (Symbol.none).toString(10), "bet2 storage slot was used by mistake");
            assert.strictEqual(game.status.toString(10), (Status.started).toString(10), "games status was not stored correctly");
        });
    });

    describe("function participateGame()", async () => {
        let instance = null;
        let gameHash = null;
        const gameStake = '1000';
        const gameSymbol  = Symbol.rock;
        const gameSymbol2 = Symbol.scissors;

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running,
                {from: owner}
            );
            gameHash = await instance.createGameHash(gameSymbol, hexClearPassword, {from: player1});
            await instance.startGame(gameHash, player2, useMsgValue, {from: player1, value: gameStake});
        });

        it("should not be possible to participate a game when contract is paused", async () => {
            await instance.pauseContract({from: owner});

            await truffleAssert.reverts(
                instance.participateGame(gameHash, gameSymbol2, useMsgValue, {from: player2, value: gameStake}),
                "Stoppable: Contract is not running"
            );
        });

        it("should not be possible to participate a game without providing 'gameHash'", async () => {
            await truffleAssert.reverts(
                instance.participateGame(hexEmptyPassword, gameSymbol2, useMsgValue, {from: player2, value: gameStake}),
                "gameHash has to be provided"
            );
        });

        it("should not be possible to participate a game with an invalid 'bet'", async () => {
            await truffleAssert.reverts(
                instance.participateGame(gameHash, 0, useMsgValue, {from: player2, value: gameStake}),
                "Bet is invalid. Select 'Rock', 'Paper' or 'Scissors'!"
            );

            await truffleAssert.fails(
                instance.participateGame(gameHash, 4, useMsgValue, {from: player2, value: gameStake}),
                truffleAssert.ErrorType.INVALID_OPCODE
            );
        });

        it("should not be possible to participate a game if game was not started", async () => {
            const nonStartedGameHash = await instance.createGameHash(Symbol.paper, hexClearPassword, {from: player1});
            await truffleAssert.reverts(
                instance.participateGame(nonStartedGameHash, gameSymbol2, useMsgValue, {from: player2, value: gameStake}),
                "Game has not been started yet"
            );
        });

        it("should not be possible to participate a game by an attacker", async () => {
            await truffleAssert.reverts(
                instance.participateGame(gameHash, gameSymbol2, useMsgValue, {from: attacker, value: gameStake}),
                "msg.sender is not player2"
            );
        });

        it("should not be possible to participate a game if msg.value is not equal to games stake", async () => {
            await truffleAssert.reverts(
                instance.participateGame(gameHash, gameSymbol2, useMsgValue, {from: player2, value: 1}),
                "msg.value does not match games stake"
            );
        });

        it("should be possible to participate a game by player2", async () => {
            const returned = await instance.participateGame.call(gameHash, gameSymbol2, useMsgValue, {from: player2, value: gameStake});
            assert.strictEqual(returned, true, "game cannot be participated by player2");

            const contractBalanceBefore = await web3.eth.getBalance(instance.address);
            assert.strictEqual(contractBalanceBefore.toString(10), gameStake, "contract balance is not correct");

            const txObj = await instance.participateGame(gameHash, gameSymbol2, useMsgValue, {from: player2, value: gameStake});
            truffleAssert.eventEmitted(txObj, "LogGameParticipated");

            const logGameHash       = txObj.receipt.logs[0].args.gameHash;
            const logSender         = txObj.receipt.logs[0].args.player2;
            const logSymbol         = txObj.receipt.logs[0].args.bet;
            const logUsePlayerStake = txObj.receipt.logs[0].args.usePlayerStake;
            assert.strictEqual(logGameHash, gameHash, "gameHash was not logged correctly");
            assert.strictEqual(logSender, player2, "msg.sender was not logged correctly");
            assert.strictEqual(logSymbol.toString(10), gameSymbol2.toString(10), "bet was not logged correctly");
            assert.strictEqual(logUsePlayerStake, useMsgValue, "usePlayerStake was not logged correctly");

            const contractBalanceAfter = await web3.eth.getBalance(instance.address);
            assert.strictEqual(contractBalanceAfter.toString(10), (gameStake*2).toString(10), "contract balance is not correct");

            const game = await instance.games(gameHash);
            assert.strictEqual(game.player1, player1, "player1 was overwritten by mistake");
            assert.strictEqual(game.player2, player2, "player2 was overwritten by mistake");
            assert.strictEqual(game.stake.toString(10), gameStake, "gameStake was overwritten by mistake");
            assert.strictEqual(game.bet2.toString(10), (gameSymbol2).toString(10), "bet2 was not stored correctly");
            assert.strictEqual(game.status.toString(10), (Status.participated).toString(10), "games status was not stored correctly");
        });
    });

    describe("function endGame()", async () => {
        let instance = null;
        let gameHash = null;
        const gameStake = '1000';
        const gameSymbol  = Symbol.rock;
        const gameSymbol2 = Symbol.scissors;

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running,
                {from: owner}
            );
            gameHash = await instance.createGameHash(gameSymbol, hexClearPassword, {from: player1});
            await instance.startGame(gameHash, player2, useMsgValue, {from: player1, value: gameStake});
            await instance.participateGame(gameHash, gameSymbol2, useMsgValue, {from: player2, value: gameStake});
        });

        it("should not be possible to end a game when contract is paused", async () => {
            await instance.pauseContract({from: owner});

            await truffleAssert.reverts(
                instance.endGame(gameSymbol, hexClearPassword, {from: player1}),
                "Stoppable: Contract is not running"
            );
        });

        it("should not be possible to end a game when sending value", async () => {
            await truffleAssert.reverts(
                instance.endGame(gameSymbol, hexClearPassword, {from: player1, value: 1})
            );
        });

        it("should not be possible to end a game with an invalid 'bet'", async () => {
            await truffleAssert.reverts(
                instance.endGame(0, hexClearPassword, {from: player1}),
                "Bet is invalid. Select 'Rock', 'Paper' or 'Scissors'!"
            );

            await truffleAssert.fails(
                instance.endGame(4, hexClearPassword, {from: player1}),
                truffleAssert.ErrorType.INVALID_OPCODE
            );
        });

        it("should not be possible to end a game when game status was not 'participated'", async () => {
            const clearPasswordTest = "passwordDummyTest";
            const hexClearPasswordTest = web3.utils.asciiToHex(clearPasswordTest);

            await truffleAssert.reverts(
                instance.endGame(gameSymbol, hexClearPasswordTest, {from: player1}),
                "Game does not exist or player2 has not placed a bet yet"
            );
        });

        it("should not be possible to end a game by an attacker", async () => {
            await truffleAssert.reverts(
                instance.endGame(gameSymbol, hexClearPassword, {from: attacker}),
                "Game does not exist or player2 has not placed a bet yet"
            );
        });

        it("should be possible to end a game by player1", async () => {
            const returned = await instance.endGame.call(gameSymbol, hexClearPassword, {from: player1});
            assert.strictEqual(returned.toString(10), (gameOutcome.player1).toString(10), "game cannot be ended by player1");

            const txObj = await instance.endGame(gameSymbol, hexClearPassword, {from: player1});
            truffleAssert.eventEmitted(txObj, "LogGameEnded");

            const logGameHash   = txObj.receipt.logs[0].args.gameHash;
            const logSender     = txObj.receipt.logs[0].args.player1;
            const logSymbol     = txObj.receipt.logs[0].args.bet;
            const logOutcome    = txObj.receipt.logs[0].args.outcome;
            assert.strictEqual(logGameHash, gameHash, "gameHash was not logged correctly");
            assert.strictEqual(logSender, player1, "msg.sender was not logged correctly");
            assert.strictEqual(logSymbol.toString(10), gameSymbol.toString(10), "bet was not logged correctly");
            assert.strictEqual(logOutcome.toString(10), (gameOutcome.player1).toString(10), "outcome was not logged correctly");

            const game = await instance.games(gameHash);
            assert.strictEqual(game.player1, zeroAddress, "player1 is still stored");
            assert.strictEqual(game.player2, zeroAddress, "player2 is still stored");
            assert.strictEqual(game.stake.toString(10), '0', "gameStake is still stored");
            assert.strictEqual(game.bet2.toString(10), '0', "bet2 is still stored");
            assert.strictEqual(game.status.toString(10), (Status.ended).toString(10), "games status was not stored correctly");

            const player1balance = await instance.accountBalance(player1);
            assert.strictEqual(player1balance.toString(10), (gameStake*2).toString(10), "player1 account balance is not correct");
        });
    });

    describe("rockPaperScissors game outcomes:", async () => {
        let instance = null;
        let gameHash = null;
        const gameStake = '1000';

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running,
                {from: owner}
            );
            gameHash = await instance.createGameHash(Symbol.rock, hexClearPassword, {from: player1});
            await instance.startGame(gameHash, player2, useMsgValue, {from: player1, value: gameStake});
        });

        it("- draw", async () => {
            await instance.participateGame(gameHash, Symbol.rock, useMsgValue, {from: player2, value: gameStake});
            const txObj = await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});

            const logOutcome    = txObj.receipt.logs[0].args.outcome;
            assert.strictEqual(logOutcome.toString(10), (gameOutcome.draw).toString(10), "outcome was not correct");
        });

        it("- player1", async () => {
            await instance.participateGame(gameHash, Symbol.scissors, useMsgValue, {from: player2, value: gameStake});
            const txObj = await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});

            const logOutcome = txObj.receipt.logs[0].args.outcome;
            assert.strictEqual(logOutcome.toString(10), (gameOutcome.player1).toString(10), "outcome was not correct");
        });

        it("-- should not be possible to start a game by player1 with player stake when sending value", async () => {
            await instance.participateGame(gameHash, Symbol.scissors, useMsgValue, {from: player2, value: gameStake});
            await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});

            const newGameHash = await instance.createGameHash(Symbol.paper, hexClearPassword, {from: player1});

            truffleAssert.reverts(
                instance.startGame(newGameHash, player2, usePlayerStake, {from: player1, value: gameStake}),
                "Sending value while using players stake is prohibited"
            );
        });

        it("-- should be possible to start a game by player1 with player stake", async () => {
            await instance.participateGame(gameHash, Symbol.scissors, useMsgValue, {from: player2, value: gameStake});
            await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});

            //Start 2nd game
            const contractBalanceBefore = await web3.eth.getBalance(instance.address);
            const player1ContractBalanceBefore = await instance.accountBalance(player1);
            const newGameStake = player1ContractBalanceBefore.toString(10);

            const newGameHash = await instance.createGameHash(Symbol.paper, hexClearPassword, {from: player1});

            const returned = await instance.startGame.call(newGameHash, player2, usePlayerStake, {from: player1});
            assert.strictEqual(returned, true, "game cannot be started by player1");

            const txObj = await instance.startGame(newGameHash, player2, usePlayerStake, {from: player1});
            truffleAssert.eventEmitted(txObj, "LogGameStarted");

            const logGameStake      = txObj.receipt.logs[0].args.gameStake;
            const logUsePlayerStake = txObj.receipt.logs[0].args.usePlayerStake;
            assert.strictEqual(logGameStake.toString(10), newGameStake, "gameStake was not logged correctly");
            assert.strictEqual(logUsePlayerStake, usePlayerStake, "usePlayerStake was not logged correctly");

            const contractBalanceAfter = await web3.eth.getBalance(instance.address);
            const player1ContractBalanceAfter = await instance.accountBalance(player1);
            assert.strictEqual(
                contractBalanceAfter.toString(10),
                contractBalanceBefore.toString(10),
                "contracts balance is not correct"
            );
            assert.strictEqual(
                player1ContractBalanceBefore.sub(player1ContractBalanceAfter).toString(10),
                newGameStake,
                "player1 contract account balance is not correct"
            );

            const game = await instance.games(newGameHash);
            assert.strictEqual(game.player1, player1, "player1 was not stored correctly");
            assert.strictEqual(game.player2, player2, "player2 was not stored correctly");
            assert.strictEqual(game.stake.toString(10), newGameStake, "newGameStake was not stored correctly");
            assert.strictEqual(game.bet2.toString(10), (Symbol.none).toString(10), "bet2 storage slot was used by mistake");
            assert.strictEqual(game.status.toString(10), (Status.started).toString(10), "games status was not stored correctly");
        });

        it("- player2", async () => {
            await instance.participateGame(gameHash, Symbol.paper, useMsgValue, {from: player2, value: gameStake});
            const txObj = await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});

            const logOutcome = txObj.receipt.logs[0].args.outcome;
            assert.strictEqual(logOutcome.toString(10), (gameOutcome.player2).toString(10), "outcome was not correct");
        });

        it("-- should not be possible to participate a game by player2 with player stake when sending value", async () => {
            await instance.participateGame(gameHash, Symbol.paper, useMsgValue, {from: player2, value: gameStake});
            await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});

            const newGameHash = await instance.createGameHash(Symbol.paper, hexClearPassword, {from: player1});
            await instance.startGame(newGameHash, player2, useMsgValue, {from: player1, value: gameStake}),

            truffleAssert.reverts(
                instance.participateGame(newGameHash, Symbol.paper, usePlayerStake, {from: player2, value: gameStake}),
                "Sending value while using players stake is prohibited"
            );
        });

        it("-- should not be possible to participate a game by player2 with player stake when amount insufficient", async () => {
            await instance.participateGame(gameHash, Symbol.paper, useMsgValue, {from: player2, value: gameStake});
            await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});

            const player2contractBalanceBefore = await instance.accountBalance(player2);

            const newGameHash = await instance.createGameHash(Symbol.paper, hexClearPassword, {from: player1});
            await instance.startGame(newGameHash, player2, useMsgValue, {from: player1, value: player2contractBalanceBefore+1}),

            truffleAssert.reverts(
                instance.participateGame(newGameHash, Symbol.paper, usePlayerStake, {from: player2, value: gameStake}),
                "Players stake is insufficient"
            );
        });

        it("-- should be possible to participate a game by player2 with player stake", async () => {
            await instance.participateGame(gameHash, Symbol.paper, useMsgValue, {from: player2, value: gameStake});
            await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});


            //Start 2nd game
            const contractBalanceBefore = await web3.eth.getBalance(instance.address);
            const player2contractBalanceBefore = await instance.accountBalance(player2);
            const newGameStake = '50';

            const newGameHash = await instance.createGameHash(Symbol.paper, hexClearPassword, {from: player1});
            await instance.startGame(newGameHash, player2, useMsgValue, {from: player1, value: newGameStake});

            const returned = await instance.participateGame.call(newGameHash, Symbol.paper, usePlayerStake, {from: player2});
            assert.strictEqual(returned, true, "game cannot be participated by player2");

            const txObj = await instance.participateGame(newGameHash, Symbol.paper, usePlayerStake, {from: player2});
            truffleAssert.eventEmitted(txObj, "LogGameParticipated");

            const logUsePlayerStake = txObj.receipt.logs[0].args.usePlayerStake;
            assert.strictEqual(logUsePlayerStake, usePlayerStake, "usePlayerStake was not logged correctly");

            const contractBalanceAfter = await web3.eth.getBalance(instance.address);
            const player2contractBalanceAfter = await instance.accountBalance(player2);
            assert.strictEqual(
                toBN(contractBalanceBefore).add(toBN(newGameStake)).toString(10),
                contractBalanceAfter.toString(10),
                "contract balance is not correct"
            );
            assert.strictEqual(
                toBN(player2contractBalanceBefore).sub(toBN(newGameStake)).toString(10),
                player2contractBalanceAfter.toString(10),
                "player2 contract account balance is not correct"
            );
        });
    });

    describe("function withdraw()", async () => {
        let instance = null;
        let gameHash = null;
        const gameStake = '1000';

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running,
                {from: owner}
            );
            gameHash = await instance.createGameHash(Symbol.rock, hexClearPassword, {from: player1});
            await instance.startGame(gameHash, player2, useMsgValue, {from: player1, value: gameStake});
            await instance.participateGame(gameHash, Symbol.scissors, useMsgValue, {from: player2, value: gameStake});
            await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});
        });

        it("should not be possible to withdraw when contract is paused", async () => {
            await instance.pauseContract({from: owner});

            await truffleAssert.reverts(
                instance.withdraw({from: player1}),
                "Stoppable: Contract is not running"
            );
        });

        it("should not be possible to withdraw by an attacker", async () => {
            truffleAssert.reverts(
                instance.withdraw({from: attacker}),
                "No value to retrieve"
            );
        });

        it("should be possible to withdraw by player1", async () => {
            const returned = await instance.withdraw.call({from: player1});
            assert.strictEqual(returned, true, "account balance cannot be withdrawn by player1");

            const player1BalanceBefore = await web3.eth.getBalance(player1);
            const contractBalanceBefore = await web3.eth.getBalance(instance.address);
            const player1ContractBalanceBefore = await instance.accountBalance(player1);
            assert.strictEqual(contractBalanceBefore.toString(10), (gameStake*2).toString(10), "contract balance is not correct");
            assert.strictEqual(player1ContractBalanceBefore.toString(10), (gameStake*2).toString(10), "player1 contract balance is not correct");

            const txObj = await instance.withdraw({from: player1});
            truffleAssert.eventEmitted(txObj, "LogWithdraw");

            const tx = await web3.eth.getTransaction(txObj.tx);
            const txFee = toBN(tx.gasPrice).mul(toBN(txObj.receipt.gasUsed));

            const logSender     = txObj.receipt.logs[0].args.player;
            const logAmount     = txObj.receipt.logs[0].args.amount;
            assert.strictEqual(logSender, player1, "player1 was not logged correctly");
            assert.strictEqual(logAmount.toString(10), (gameStake*2).toString(10), "amount was not logged correctly");

            const player1BalanceAfter = await web3.eth.getBalance(player1);
            const contractBalanceAfter = await web3.eth.getBalance(instance.address);
            const player1ContractBalanceAfter = await instance.accountBalance(player1);
            assert.strictEqual(contractBalanceAfter.toString(10), '0', "contract balance was not stored correctly");
            assert.strictEqual(player1ContractBalanceAfter.toString(10), '0', "player1 contract balance was not stored correctly");
            assert.strictEqual(
                toBN(contractBalanceBefore).sub(toBN(player1ContractBalanceBefore)).toString(10),
                toBN(contractBalanceAfter).toString(10),
                "contract balance is not correct after withdraw"
            );
            assert.strictEqual(
                toBN(player1BalanceBefore).add(toBN(player1ContractBalanceBefore)).sub(toBN(txFee)).toString(10),
                toBN(player1BalanceAfter).toString(10),
                "player1 balance is not correct after withdraw"
            );
        });
    });
});