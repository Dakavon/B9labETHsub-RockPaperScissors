// SPDX-License-Identifier: Unlicense

//B9lab ETH-SUB Ethereum Developer Subscription Course
//>>> RockPaperScissors <<<
//
//Last update: 31.01.2021

pragma solidity 0.7.6;

import "./Stoppable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title RockPaperScissors
 *  Play the classic rock paper scissors game
 */
contract RockPaperScissors is Stoppable{
    using SafeMath for uint;

    /**
     * RockPaperScissors game symbols
     */
    enum Symbol{
        none,
        rock,
        paper,
        scissors
    }

    /**
     * Game status:
     *  "0": nonExistent    (Game not started)
     *  "1": started        (Player1 submitted encrypted bet)
     *  "2": participated   (Player2 submitted bet)
     *  "3": ended          (Player1 revealed bet and winner is elected)
     */
    enum Status{
        nonExistent,
        started,
        participated,
        ended
    }

    /**
     * Game outcomes
     */
    enum GameOutcome{
        draw,
        player1,
        player2
    }

    /**
     * Struct for each game between player1 and player2
     */
    struct Game{
        address player1;
        address player2;
        uint    stake;
        Symbol  bet2;
        uint    deadline;
        Status  status;
    }
    mapping (bytes32 => Game) public games;

    //Accounting
    mapping (address => uint) public accountBalance;

    //Players have a specific time duration to submit their bet before game can be retracted
    uint public blocksReactionTime;

    /**
     * Events
     */
    event LogGameStarted(bytes32 indexed gameHash, address indexed player1, uint valueSent, address indexed player2, uint gameStake, uint deadline);
    event LogGameParticipated(bytes32 indexed gameHash, address indexed player2, uint valueSent, Symbol bet, uint deadline);
    event LogGameEnded(bytes32 indexed gameHash, address indexed player1, Symbol bet, uint gameResult);
    event LogGameRetracted(bytes32 indexed gameHash, address indexed player);
    event LogWithdraw(address indexed player, uint amount);
    event LogBlocksReactionTimeSet(address indexed sender, uint newBlocksReactionTime);

    /**
     * @dev Contract constructor function
     *
     * @param initialState The state the contract is in after deployment (paused or running)
     */
    constructor(State initialState, uint _blocksReactionTime) Stoppable(initialState) {
        setBlocksReactionTime(_blocksReactionTime);
    }

    /**
     * @dev Support function: Create a hashed bet that is used as 'game hash'
     *
     * @param bet Bet is the game symbol selected by player1
     * @param purePassword Unique password given by player1
     */
    function createGameHash(Symbol bet, bytes32 purePassword) public view returns(bytes32 gameHash){
        require(Symbol.none < bet, "Bet is invalid. Select 'Rock', 'Paper' or 'Scissors'!");
        require(purePassword != "", "purePassword has to be provided");

        return keccak256(abi.encodePacked(bet, purePassword, msg.sender, address(this)));
    }

    /**
     * @dev Step1: Start rock paper scissors game (by player1)
     *
     * @param gameHash gameHash that was created by createGameHash() by player1
     * @param opponent The address of player2 which player1 wants to play with
     * @param gameStake Player1 decides on the amount of the game stake and can use msg.value and her/his player contract balance to play
     */
    function startGame(bytes32 gameHash, address opponent, uint gameStake) public payable onlyIfRunning returns(bool success){
        require(gameHash != "", "gameHash has to be provided");
        require(opponent != address(0x0) && opponent != msg.sender, "Bad opponent");

        require(games[gameHash].status == Status.nonExistent, "Game must be unique");

        uint playerFunds = accountBalance[msg.sender].add(msg.value);
        require(gameStake <= playerFunds, "Players funds are insufficient");

        accountBalance[msg.sender] = playerFunds.sub(gameStake);

        uint deadline = block.number.add(blocksReactionTime);

        games[gameHash].player1 = msg.sender;
        games[gameHash].player2 = opponent;
        games[gameHash].stake = gameStake;
        games[gameHash].deadline = deadline;
        games[gameHash].status = Status.started;

        emit LogGameStarted(gameHash, msg.sender, msg.value, opponent, gameStake, deadline);
        return true;
    }

    /**
     * @dev Step2: Participate rock paper scissors game (by player2)
     *
     * @param gameHash gameHash that player2 is associated with
     * @param bet The game symbol selected by player2
     */
    function participateGame(bytes32 gameHash, Symbol bet) public payable onlyIfRunning returns(bool success){
        require(Symbol.none < bet, "Bet is invalid. Select 'Rock', 'Paper' or 'Scissors'!");

        require(games[gameHash].status == Status.started, "Game has not been started yet");
        require(games[gameHash].player2 == msg.sender, "msg.sender is not player2");

        uint gameStake = games[gameHash].stake;
        uint playerFunds = accountBalance[msg.sender].add(msg.value);
        require(gameStake <= playerFunds, "Players funds are insufficient");

        accountBalance[msg.sender] = playerFunds.sub(gameStake);

        uint deadline = block.number.add(blocksReactionTime);

        games[gameHash].bet2 = bet;
        games[gameHash].deadline = deadline;
        games[gameHash].status = Status.participated;

        emit LogGameParticipated(gameHash, msg.sender, msg.value, bet, deadline);
        return true;
    }

    /**
     * @dev Step3: End rock paper scissors game (by player1)
     *
     * @param bet The game symbol that was selected by player1 during game start
     * @param purePassword The password chosen by player1 during game start
     */
    function endGame(Symbol bet, bytes32 purePassword) public onlyIfRunning returns(uint gameResult){
        require(Symbol.none < bet, "Bet is invalid. Select 'Rock', 'Paper' or 'Scissors'!");

        bytes32 gameHash = createGameHash(bet, purePassword);
        require(games[gameHash].status == Status.participated, "Game does not exist or player2 has not placed a bet yet");

        address player1 = games[gameHash].player1;
        address player2 = games[gameHash].player2;
        Symbol bet2     = games[gameHash].bet2;
        uint stake      = games[gameHash].stake;

        //Identify winning player:
        //  (3 + betPlayer1 - betPlayer2) % 3
        gameResult = (uint(3).add(uint(bet)).sub(uint(bet2))).mod(3);

        if(gameResult == uint(GameOutcome.draw)){
            accountBalance[player1] = accountBalance[player1].add(stake);
            accountBalance[player2] = accountBalance[player2].add(stake);
        }
        else if(gameResult == uint(GameOutcome.player1)){
            accountBalance[player1] = accountBalance[player1].add(stake.mul(2));
        }
        else if(gameResult == uint(GameOutcome.player2)){
            accountBalance[player2] = accountBalance[player2].add(stake.mul(2));
        }
        else{
            revert("Something bad happened.");
        }

        deleteGame(gameHash);

        emit LogGameEnded(gameHash, msg.sender, bet, gameResult);
        return gameResult;
    }

    /**
     * @dev Delete game struct of stored game
     *
     * @param gameHash The game hash of the game that should be deleted
     */
    function deleteGame(bytes32 gameHash) internal{
        delete games[gameHash].player1;
        delete games[gameHash].player2;
        delete games[gameHash].stake;
        delete games[gameHash].bet2;
        delete games[gameHash].deadline;

        games[gameHash].status = Status.ended;
    }

    /**
     * @dev Retract game if opponent refuses to play next move (by player1/player2)
     *
     * @param gameHash The game hash of the game that should be retracted
     */
     function retractGame(bytes32 gameHash) public onlyIfRunning returns(bool success){
        require(games[gameHash].deadline < block.number, "Deadline is not expired yet");

        Status gameStatus = games[gameHash].status;

        if(gameStatus == Status.started){
            require(games[gameHash].player1 == msg.sender, "Only player1 is allowed to retract at his point");

            accountBalance[msg.sender] = accountBalance[msg.sender].add(games[gameHash].stake);
        }
        else if(gameStatus == Status.participated){
            require(games[gameHash].player2 == msg.sender, "Only player2 is allowed to retract at his point");

            accountBalance[msg.sender] = accountBalance[msg.sender].add((games[gameHash].stake).mul(2));
        }
        else{
            revert("Game cannot be retracted");
        }

        deleteGame(gameHash);

        emit LogGameRetracted(gameHash, msg.sender);
        return true;
    }

    /**
     * @dev Withdraw players account balance
     */
    function withdraw() public onlyIfRunning returns(bool success){
        uint amount = accountBalance[msg.sender];
        require(amount > 0, "No value to retrieve");

        accountBalance[msg.sender] = 0;
        emit LogWithdraw(msg.sender, amount);

        //EIP 1884 (https://eips.ethereum.org/EIPS/eip-1884) within Istanbul hard fork
        //Avoidance of Solidity's transfer() or send() methods
        (success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }

    /**
     * @dev Players reaction time can be tuned (by owner)
     *
     * @param newBlocksReactionTime Time duration in blocks until game can be retracted by player1/player2
     */
    function setBlocksReactionTime(uint newBlocksReactionTime) public onlyOwner returns(bool success){
        require(0 < newBlocksReactionTime, "blocksReactionTime needs to be set");

        blocksReactionTime = newBlocksReactionTime;

        emit LogBlocksReactionTimeSet(msg.sender, newBlocksReactionTime);
        return true;
    }
}