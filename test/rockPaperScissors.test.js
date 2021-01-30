//B9lab ETH-SUB Ethereum Developer Subscription Course
//>>> RockPaperScissors <<< - Test file
//
//Last update: 03.01.2021

const RockPaperScissors = artifacts.require("RockPaperScissors");
const truffleAssert = require("truffle-assertions");
const timeMachine = require('ganache-time-traveler');
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
        nonExistent: 0,
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

    const gameStake = '1000';
    const blocksReactionTime = '100';


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
                    contractState.destroyed, blocksReactionTime,
                    {from: owner}
                ),
                "Stoppable: Initial contract state can be 0 (paused) or 1 (running)"
            );
        });

        it("should not be possible to start RockPaperScissors with invalid 'blocksReactionTime'", async () => {
            await truffleAssert.reverts(
                RockPaperScissors.new(
                    contractState.running, 0,
                    {from: owner}
                ),
                "blocksReactionTime needs to be set"
            );
        });

        it("should not be possible to send value to constructor", async () => {
            await truffleAssert.reverts(
                RockPaperScissors.new(
                    contractState.running, blocksReactionTime,
                    {from: owner, value: 1}
                )
            );
        });

        it("should be possible to start RockPaperScissors as 'paused'", async () => {
            const instance = await RockPaperScissors.new(
                contractState.paused, blocksReactionTime,
                {from: owner}
            );

            const _state = await instance.getState({from: player1});
            assert.strictEqual(_state.toNumber(), contractState.paused, "contract could not set to paused");
        });

        it("should be possible to start RockPaperScissors as 'running'", async () => {
            const instance = await RockPaperScissors.new(
                contractState.running, blocksReactionTime,
                {from: owner}
            );

            const _state = await instance.getState({from: player1});
            assert.strictEqual(_state.toNumber(), contractState.running, "contract could not set to running");
        });

        it("blocksReactionTime should be stored correctly", async () => {
            const instance = await RockPaperScissors.new(
                contractState.running, blocksReactionTime,
                {from: owner}
            );
            const txObj = await truffleAssert.createTransactionResult(instance, instance.transactionHash);
            truffleAssert.eventEmitted(txObj, "LogBlocksReactionTimeSet");

            const logblocksReactionTime = txObj.logs[0].args.newBlocksReactionTime;
            assert.strictEqual(logblocksReactionTime.toString(10), blocksReactionTime, "blocksReactionTime was not logged correctly");

            const _blocksReactionTime = await instance.blocksReactionTime({from: player1});
            assert.strictEqual(_blocksReactionTime.toString(10), blocksReactionTime, "blocksReactionTime was not stored correctly");
        });
    });


    describe("function createGameHash()", async () => {
        let instance = null;

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running, blocksReactionTime,
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

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running, blocksReactionTime,
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
            const emptyGameHash = "";
            const hexEmptyGameHash = web3.utils.asciiToHex(emptyGameHash);

            await truffleAssert.reverts(
                instance.startGame(hexEmptyGameHash, player2, useMsgValue, {from: player1, value: gameStake}),
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
            const logDeadline       = txObj.receipt.logs[0].args.deadline;
            assert.strictEqual(logGameHash, gameHash, "gameHash was not logged correctly");
            assert.strictEqual(logSender, player1, "msg.sender was not logged correctly");
            assert.strictEqual(logOpponent, player2, "opponent was not logged correctly");
            assert.strictEqual(logGameStake.toString(10), gameStake, "gameStake was not logged correctly");
            assert.strictEqual(logUsePlayerStake, useMsgValue, "usePlayerStake was not logged correctly");
            assert.strictEqual(
                logDeadline.toString(10),
                toBN(txObj.receipt.blockNumber).add(toBN(blocksReactionTime)).toString(10),
                "deadline was not logged correctly"
            );

            const contractBalanceAfter = await web3.eth.getBalance(instance.address);
            assert.strictEqual(contractBalanceAfter.toString(10), gameStake, "contracts balance is not correct");

            const game = await instance.games(gameHash);
            assert.strictEqual(game.player1, player1, "player1 was not stored correctly");
            assert.strictEqual(game.player2, player2, "player2 was not stored correctly");
            assert.strictEqual(game.stake.toString(10), gameStake, "gameStake was not stored correctly");
            assert.strictEqual(game.bet2.toString(10), (Symbol.none).toString(10), "bet2 storage slot was used by mistake");
            assert.strictEqual(
                game.deadline.toString(10),
                toBN(txObj.receipt.blockNumber).add(toBN(blocksReactionTime)).toString(10),
                "deadline was not stored correctly"
            );
            assert.strictEqual(game.status.toString(10), (Status.started).toString(10), "games status was not stored correctly");
        });
    });


    describe("function participateGame()", async () => {
        let instance = null;
        let gameHash = null;
        const gameSymbolPlayer1 = Symbol.rock;
        const gameSymbolPlayer2 = Symbol.scissors;

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running, blocksReactionTime,
                {from: owner}
            );
            gameHash = await instance.createGameHash(gameSymbolPlayer1, hexClearPassword, {from: player1});
            await instance.startGame(gameHash, player2, useMsgValue, {from: player1, value: gameStake});
        });

        it("should not be possible to participate a game when contract is paused", async () => {
            await instance.pauseContract({from: owner});

            await truffleAssert.reverts(
                instance.participateGame(gameHash, gameSymbolPlayer2, useMsgValue, {from: player2, value: gameStake}),
                "Stoppable: Contract is not running"
            );
        });

        it("should not be possible to participate a game without providing 'gameHash'", async () => {
            const emptyGameHash = "";
            const hexEmptyGameHash = web3.utils.asciiToHex(emptyGameHash);

            await truffleAssert.reverts(
                instance.participateGame(hexEmptyGameHash, gameSymbolPlayer2, useMsgValue, {from: player2, value: gameStake}),
                "Game has not been started yet"
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

        it("should not be possible to participate a game if game was not 'started'", async () => {
            const nonStartedGameHash = await instance.createGameHash(Symbol.paper, hexClearPassword, {from: player1});

            await truffleAssert.reverts(
                instance.participateGame(nonStartedGameHash, gameSymbolPlayer2, useMsgValue, {from: player2, value: gameStake}),
                "Game has not been started yet"
            );
        });

        it("should not be possible to participate a game by an attacker", async () => {
            await truffleAssert.reverts(
                instance.participateGame(gameHash, gameSymbolPlayer2, useMsgValue, {from: attacker, value: gameStake}),
                "msg.sender is not player2"
            );
        });

        it("should not be possible to participate a game if msg.value is not equal to games stake", async () => {
            await truffleAssert.reverts(
                instance.participateGame(gameHash, gameSymbolPlayer2, useMsgValue, {from: player2, value: 1}),
                "msg.value does not match games stake"
            );
        });

        it("should be possible to participate a game by player2", async () => {
            const returned = await instance.participateGame.call(gameHash, gameSymbolPlayer2, useMsgValue, {from: player2, value: gameStake});
            assert.strictEqual(returned, true, "game cannot be participated by player2");

            const contractBalanceBefore = await web3.eth.getBalance(instance.address);
            assert.strictEqual(contractBalanceBefore.toString(10), gameStake, "contract balance is not correct");

            const txObj = await instance.participateGame(gameHash, gameSymbolPlayer2, useMsgValue, {from: player2, value: gameStake});
            truffleAssert.eventEmitted(txObj, "LogGameParticipated");

            const logGameHash       = txObj.receipt.logs[0].args.gameHash;
            const logSender         = txObj.receipt.logs[0].args.player2;
            const logSymbol         = txObj.receipt.logs[0].args.bet;
            const logUsePlayerStake = txObj.receipt.logs[0].args.usePlayerStake;
            const logDeadline       = txObj.receipt.logs[0].args.deadline;
            assert.strictEqual(logGameHash, gameHash, "gameHash was not logged correctly");
            assert.strictEqual(logSender, player2, "msg.sender was not logged correctly");
            assert.strictEqual(logSymbol.toString(10), gameSymbolPlayer2.toString(10), "bet was not logged correctly");
            assert.strictEqual(logUsePlayerStake, useMsgValue, "usePlayerStake was not logged correctly");
            assert.strictEqual(
                logDeadline.toString(10),
                toBN(txObj.receipt.blockNumber).add(toBN(blocksReactionTime)).toString(10),
                "deadline was not logged correctly"
            );

            const contractBalanceAfter = await web3.eth.getBalance(instance.address);
            assert.strictEqual(contractBalanceAfter.toString(10), (gameStake*2).toString(10), "contract balance is not correct");

            const game = await instance.games(gameHash);
            assert.strictEqual(game.player1, player1, "player1 was overwritten by mistake");
            assert.strictEqual(game.player2, player2, "player2 was overwritten by mistake");
            assert.strictEqual(game.stake.toString(10), gameStake, "gameStake was overwritten by mistake");
            assert.strictEqual(game.bet2.toString(10), (gameSymbolPlayer2).toString(10), "bet2 was not stored correctly");
            assert.strictEqual(
                game.deadline.toString(10),
                toBN(txObj.receipt.blockNumber).add(toBN(blocksReactionTime)).toString(10),
                "deadline was not stored correctly"
            );
            assert.strictEqual(game.status.toString(10), (Status.participated).toString(10), "games status was not stored correctly");
        });
    });


    describe("function endGame()", async () => {
        let instance = null;
        let gameHash = null;
        const gameSymbolPlayer1 = Symbol.rock;
        const gameSymbolPlayer2 = Symbol.scissors;

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running, blocksReactionTime,
                {from: owner}
            );
            gameHash = await instance.createGameHash(gameSymbolPlayer1, hexClearPassword, {from: player1});
            await instance.startGame(gameHash, player2, useMsgValue, {from: player1, value: gameStake});
            await instance.participateGame(gameHash, gameSymbolPlayer2, useMsgValue, {from: player2, value: gameStake});
        });

        it("should not be possible to end a game when contract is paused", async () => {
            await instance.pauseContract({from: owner});

            await truffleAssert.reverts(
                instance.endGame(gameSymbolPlayer1, hexClearPassword, {from: player1}),
                "Stoppable: Contract is not running"
            );
        });

        it("should not be possible to end a game when sending value", async () => {
            await truffleAssert.reverts(
                instance.endGame(gameSymbolPlayer1, hexClearPassword, {from: player1, value: 1})
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
                instance.endGame(gameSymbolPlayer1, hexClearPasswordTest, {from: player1}),
                "Game does not exist or player2 has not placed a bet yet"
            );
        });

        it("should not be possible to end a game by an attacker", async () => {
            await truffleAssert.reverts(
                instance.endGame(gameSymbolPlayer1, hexClearPassword, {from: attacker}),
                "Game does not exist or player2 has not placed a bet yet"
            );
        });

        it("should be possible to end a game by player1", async () => {
            const returned = await instance.endGame.call(gameSymbolPlayer1, hexClearPassword, {from: player1});
            assert.strictEqual(returned.toString(10), (gameOutcome.player1).toString(10), "game cannot be ended by player1");

            const txObj = await instance.endGame(gameSymbolPlayer1, hexClearPassword, {from: player1});
            truffleAssert.eventEmitted(txObj, "LogGameEnded");

            const logGameHash   = txObj.receipt.logs[0].args.gameHash;
            const logSender     = txObj.receipt.logs[0].args.player1;
            const logSymbol     = txObj.receipt.logs[0].args.bet;
            const logGameResult = txObj.receipt.logs[0].args.gameResult;
            assert.strictEqual(logGameHash, gameHash, "gameHash was not logged correctly");
            assert.strictEqual(logSender, player1, "msg.sender was not logged correctly");
            assert.strictEqual(logSymbol.toString(10), gameSymbolPlayer1.toString(10), "bet was not logged correctly");
            assert.strictEqual(logGameResult.toString(10), (gameOutcome.player1).toString(10), "gameResult was not logged correctly");

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


    describe("function retractGame()", async () => {
        let instance = null;
        let gameHash = null;
        const gameSymbolPlayer1 = Symbol.rock;
        const gameSymbolPlayer2 = Symbol.scissors;

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running, blocksReactionTime,
                {from: owner}
            );
            gameHash = await instance.createGameHash(gameSymbolPlayer1, hexClearPassword, {from: player1});
            await instance.startGame(gameHash, player2, useMsgValue, {from: player1, value: gameStake});
        });

        it("should not be possible to retract a game when contract is paused", async () => {
            await instance.pauseContract({from: owner});

            await truffleAssert.reverts(
                instance.retractGame(gameHash, {from: player1}),
                "Stoppable: Contract is not running"
            );
        });

        it("should not be possible to retract a game when sending value", async () => {
            await truffleAssert.reverts(
                instance.retractGame(gameHash, {from: player1, value: 1})
            );
        });

        it("should not be possible to retract a game without providing 'gameHash'", async () => {
            const emptyGameHash = "";
            const hexEmptyGameHash = web3.utils.asciiToHex(emptyGameHash);

            await truffleAssert.reverts(
                instance.retractGame(hexEmptyGameHash, {from: player1}),
                "Game cannot be retracted"
            );
        });

        it("should not be possible to retract a game when game is not started", async () => {
            const newGameHash = await instance.createGameHash(Symbol.paper, hexClearPassword, {from: player1});

            await truffleAssert.reverts(
                instance.retractGame(newGameHash, {from: player1}),
                "Game cannot be retracted"
            );
        });

        it("should not be possible to retract a game when game has ended", async () => {
            await instance.participateGame(gameHash, gameSymbolPlayer2, useMsgValue, {from: player2, value: gameStake});
            await instance.endGame(gameSymbolPlayer1, hexClearPassword, {from: player1});

            await truffleAssert.reverts(
                instance.retractGame(gameHash, {from: player1}),
                "Game cannot be retracted"
            );
        });

        it("should not be possible to retract a (started) game (by player1/player2) if deadline is not expired", async () => {
            const game = await instance.games(gameHash);

            let blockNumber = await web3.eth.getBlockNumber();
            assert.isBelow(blockNumber, game.deadline.toNumber(), "deadline should not be expired yet");

            await truffleAssert.reverts(
                instance.retractGame(gameHash, {from: player1}),
                "Deadline is not expired yet"
            );

            blockNumber = await web3.eth.getBlockNumber();
            assert.isBelow(blockNumber, game.deadline.toNumber(), "deadline should not be expired yet");

            await truffleAssert.reverts(
                instance.retractGame(gameHash, {from: player2}),
                "Deadline is not expired yet"
            );
        });

        it("should not be possible to retract a (started) game (by player2)", async () => {
            const game = await instance.games(gameHash);

            for(let i=0; i<blocksReactionTime; i++){
                await timeMachine.advanceBlock();
            }

            let blockNumber = await web3.eth.getBlockNumber();
            assert.strictEqual(game.deadline.toNumber(), blockNumber, "deadline (started) should be expired yet");

            await truffleAssert.reverts(
                instance.retractGame(gameHash, {from: player2}),
                "Only player1 is allowed to retract at his point"
            );
        });

        it("should not be possible to retract a (started) game (by an attacker)", async () => {
            const game = await instance.games(gameHash);

            for(let i=0; i<blocksReactionTime; i++){
                await timeMachine.advanceBlock();
            }

            let blockNumber = await web3.eth.getBlockNumber();
            assert.strictEqual(game.deadline.toNumber(), blockNumber, "deadline (started) should be expired yet");

            await truffleAssert.reverts(
                instance.retractGame(gameHash, {from: attacker}),
                "Only player1 is allowed to retract at his point"
            );
        });

        it("should be possible to retract a (started) game (by player1)", async () => {
            const game = await instance.games(gameHash);

            for(let i=0; i<blocksReactionTime; i++){
                await timeMachine.advanceBlock();
            }

            let blockNumber = await web3.eth.getBlockNumber();
            assert.strictEqual(game.deadline.toNumber(), blockNumber, "deadline (started) should be expired yet");

            const contractBalanceBefore = await web3.eth.getBalance(instance.address);
            const player1ContractBalanceBefore = await instance.accountBalance(player1);

            const txObj = await instance.retractGame(gameHash, {from: player1});
            truffleAssert.eventEmitted(txObj, "LogGameRetracted");

            const logGameHash = txObj.receipt.logs[0].args.gameHash;
            const logSender   = txObj.receipt.logs[0].args.player;
            assert.strictEqual(logGameHash, gameHash, "gameHash was not logged correctly");
            assert.strictEqual(logSender, player1, "msg.sender was not logged correctly");

            const gameRetracted = await instance.games(gameHash);
            assert.strictEqual(gameRetracted.player1, zeroAddress, "player1 is still stored");
            assert.strictEqual(gameRetracted.player2, zeroAddress, "player2 is still stored");
            assert.strictEqual(gameRetracted.stake.toString(10), '0', "gameStake is still stored");
            assert.strictEqual(gameRetracted.bet2.toString(10), '0', "bet2 is still stored");
            assert.strictEqual(gameRetracted.status.toString(10), (Status.ended).toString(10), "games status was not stored correctly");

            const contractBalanceAfter = await web3.eth.getBalance(instance.address);
            const player1ContractBalanceAfter = await instance.accountBalance(player1);
            assert.strictEqual(
                toBN(contractBalanceAfter).sub(toBN(contractBalanceBefore)).toString(10),
                '0',
                "contract balance is not correct"
            );
            assert.strictEqual(
                toBN(player1ContractBalanceBefore).add(toBN(player1ContractBalanceAfter)).toString(10),
                gameStake,
                "player1 contract balance is not correct"
            );
        });

        it("should not be possible to retract a (participated) game (by player1/player2) if deadline is not expired", async () => {
            await instance.participateGame(gameHash, gameSymbolPlayer2, useMsgValue, {from: player2, value: gameStake});

            const game = await instance.games(gameHash);

            let blockNumber = await web3.eth.getBlockNumber();
            assert.isBelow(blockNumber, game.deadline.toNumber(), "deadline should not be expired yet");

            await truffleAssert.reverts(
                instance.retractGame(gameHash, {from: player1}),
                "Deadline is not expired yet"
            );

            blockNumber = await web3.eth.getBlockNumber();
            assert.isBelow(blockNumber, game.deadline.toNumber(), "deadline should not be expired yet");

            await truffleAssert.reverts(
                instance.retractGame(gameHash, {from: player2}),
                "Deadline is not expired yet"
            );
        });

        it("should not be possible to retract a (participated) game (by player1)", async () => {
            await instance.participateGame(gameHash, gameSymbolPlayer2, useMsgValue, {from: player2, value: gameStake});
            const game = await instance.games(gameHash);

            let blockNumber = await web3.eth.getBlockNumber();
            const timeInBlocks = Math.abs(toBN(blockNumber).sub(game.deadline));

            for(let i=0; i<timeInBlocks; i++){
                await timeMachine.advanceBlock();
            }

            blockNumber = await web3.eth.getBlockNumber();
            assert.strictEqual(game.deadline.toNumber(), blockNumber, "deadline (participated) should be expired yet");

            await truffleAssert.reverts(
                instance.retractGame(gameHash, {from: player1}),
                "Only player2 is allowed to retract at his point"
            );
        });

        it("should not be possible to retract a (participated) game (by an attacker)", async () => {
            await instance.participateGame(gameHash, gameSymbolPlayer2, useMsgValue, {from: player2, value: gameStake});
            const game = await instance.games(gameHash);

            let blockNumber = await web3.eth.getBlockNumber();
            const timeInBlocks = Math.abs(toBN(blockNumber).sub(game.deadline));

            for(let i=0; i<timeInBlocks; i++){
                await timeMachine.advanceBlock();
            }

            blockNumber = await web3.eth.getBlockNumber();
            assert.strictEqual(game.deadline.toNumber(), blockNumber, "deadline (participated) should be expired yet");

            await truffleAssert.reverts(
                instance.retractGame(gameHash, {from: attacker}),
                "Only player2 is allowed to retract at his point"
            );
        });

        it("should be possible to retract a (participated) game (by player2)", async () => {
            await instance.participateGame(gameHash, gameSymbolPlayer2, useMsgValue, {from: player2, value: gameStake});
            const game = await instance.games(gameHash);

            let blockNumber = await web3.eth.getBlockNumber();
            const timeInBlocks = Math.abs(toBN(blockNumber).sub(game.deadline));

            for(let i=0; i<timeInBlocks; i++){
                await timeMachine.advanceBlock();
            }

            blockNumber = await web3.eth.getBlockNumber();
            assert.strictEqual(game.deadline.toNumber(), blockNumber, "deadline (participated) should be expired yet");

            const contractBalanceBefore = await web3.eth.getBalance(instance.address);
            const player2ContractBalanceBefore = await instance.accountBalance(player2);

            const txObj = await instance.retractGame(gameHash, {from: player2});
            truffleAssert.eventEmitted(txObj, "LogGameRetracted");

            const logGameHash = txObj.receipt.logs[0].args.gameHash;
            const logSender   = txObj.receipt.logs[0].args.player;
            assert.strictEqual(logGameHash, gameHash, "gameHash was not logged correctly");
            assert.strictEqual(logSender, player2, "msg.sender was not logged correctly");

            const gameRetracted = await instance.games(gameHash);
            assert.strictEqual(gameRetracted.player1, zeroAddress, "player1 is still stored");
            assert.strictEqual(gameRetracted.player2, zeroAddress, "player2 is still stored");
            assert.strictEqual(gameRetracted.stake.toString(10), '0', "gameStake is still stored");
            assert.strictEqual(gameRetracted.bet2.toString(10), '0', "bet2 is still stored");
            assert.strictEqual(gameRetracted.status.toString(10), (Status.ended).toString(10), "games status was not stored correctly");

            const contractBalanceAfter = await web3.eth.getBalance(instance.address);
            const player2ContractBalanceAfter = await instance.accountBalance(player2);
            assert.strictEqual(
                toBN(contractBalanceAfter).sub(toBN(contractBalanceBefore)).toString(10),
                '0',
                "contract balance is not correct"
            );
            assert.strictEqual(
                toBN(player2ContractBalanceBefore).add(toBN(player2ContractBalanceAfter)).toString(10),
                (gameStake*2).toString(10),
                "player2 contract balance is not correct"
            );
        });
    });


    describe("rockPaperScissors game outcomes/flow:", async () => {
        let instance = null;
        let gameHash = null;

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running, blocksReactionTime,
                {from: owner}
            );
            gameHash = await instance.createGameHash(Symbol.rock, hexClearPassword, {from: player1});
            await instance.startGame(gameHash, player2, useMsgValue, {from: player1, value: gameStake});
        });

        it("- draw", async () => {
            await instance.participateGame(gameHash, Symbol.rock, useMsgValue, {from: player2, value: gameStake});
            const txObj = await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});

            const logGameResult = txObj.receipt.logs[0].args.gameResult;
            assert.strictEqual(logGameResult.toString(10), (gameOutcome.draw).toString(10), "gameResult was not correct");
        });

        it("- player1 wins", async () => {
            await instance.participateGame(gameHash, Symbol.scissors, useMsgValue, {from: player2, value: gameStake});
            const txObj = await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});

            const logGameResult = txObj.receipt.logs[0].args.gameResult;
            assert.strictEqual(logGameResult.toString(10), (gameOutcome.player1).toString(10), "gameResult was not correct");
        });

        it("-- should not be possible to start a game by player1 with player stake when sending value", async () => {
            await instance.participateGame(gameHash, Symbol.scissors, useMsgValue, {from: player2, value: gameStake});
            await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});

            //Start 2nd game
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
            assert.strictEqual(logGameStake.toString(10), newGameStake, "newGameStake was not logged correctly");
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

        it("- player2 wins", async () => {
            await instance.participateGame(gameHash, Symbol.paper, useMsgValue, {from: player2, value: gameStake});
            const txObj = await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});

            const logGameResult = txObj.receipt.logs[0].args.gameResult;
            assert.strictEqual(logGameResult.toString(10), (gameOutcome.player2).toString(10), "gameResult was not correct");
        });

        it("-- should not be possible to participate a game by player2 with player stake when sending value", async () => {
            await instance.participateGame(gameHash, Symbol.paper, useMsgValue, {from: player2, value: gameStake});
            await instance.endGame(Symbol.rock, hexClearPassword, {from: player1});

            //Start 2nd game
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

            //Start 2nd game
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

            //Participate 2nd game
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

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running, blocksReactionTime,
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

        it("should be possible to withdraw by player", async () => {
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

            const logSender = txObj.receipt.logs[0].args.player;
            const logAmount = txObj.receipt.logs[0].args.amount;
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


    describe("function setBlocksReactionTime()", async () => {
        let instance = null;

        beforeEach("deploy new instance", async () => {
            instance = await RockPaperScissors.new(
                contractState.running, blocksReactionTime,
                {from: owner}
            );
        });

        it("should not be possible to set new reaction time by an attacker", async () => {
            truffleAssert.reverts(
                instance.setBlocksReactionTime(blocksReactionTime, {from: attacker}),
                "Owned: Caller is not the owner"
            );
        });

        it("should not be possible to set new reaction time to 0 (by owner)", async () => {
            truffleAssert.reverts(
                instance.setBlocksReactionTime(0, {from: owner}),
                "blocksReactionTime needs to be set"
            );
        });

        it("should be possible to set new reaction time (by owner)", async () => {
            const newBlockReactionTime = '250';

            const returned = await instance.setBlocksReactionTime.call(newBlockReactionTime, {from: owner});
            assert.strictEqual(returned, true, "blocksReactionTime cannot be changed by owner");

            const txObj = await instance.setBlocksReactionTime(newBlockReactionTime, {from: owner});
            truffleAssert.eventEmitted(txObj, "LogBlocksReactionTimeSet");

            const logSender = txObj.receipt.logs[0].args.sender;
            const logNewBlocksReactionTime = txObj.receipt.logs[0].args.newBlocksReactionTime;
            assert.strictEqual(logSender, owner, "sender was not logged correctly");
            assert.strictEqual(logNewBlocksReactionTime.toString(10), newBlockReactionTime, "newBlockReactionTime was not logged correctly");

            const contractBlockReactionTime = await instance.blocksReactionTime();
            assert.strictEqual(contractBlockReactionTime.toString(10), newBlockReactionTime, "newBlockReactionTime was not stored correctly");
        });
    });

});