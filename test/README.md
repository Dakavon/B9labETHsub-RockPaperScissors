# Test results: RockPaperScissors

```
truffle(develop)> test test/rockPaperScissors.test.js
Using network 'develop'.


Compiling your contracts...
===========================
> Everything is up to date, there is nothing to compile.

  network: develop


  Contract: RockPaperScissors

    There are five accounts available:
	#0: 0x546546CE0DD629c1cF8632cC3cBB51EB700e9AA4
	#1: 0xD0862801bCa8FFB28Fc2668a19470538Cd1898ca
	#2: 0xD6cafe0095B00Df759e2DaF9E33Fe9D1a36F581D
	#3: 0x97aBb5A10c6A11d546D14550bdc4ae42Ddf74a58
	#4: 0x6eF28e348e9C486BA5E3056e07fCD07DC2f879A4


    constructor()
      ✓ should not be possible to start RockPaperScissors as 'destroyed' (2479ms)
      ✓ should not be possible to start RockPaperScissors with invalid 'blocksReactionTime' (673ms)
      ✓ should not be possible to send value to constructor (252ms)
      ✓ should be possible to start RockPaperScissors as 'paused' (393ms)
      ✓ should be possible to start RockPaperScissors as 'running' (373ms)
      ✓ blocksReactionTime should be stored correctly (422ms)
    function createGameHash()
      ✓ should not be possible to create a game hash with an invalid 'bet' (143ms)
      ✓ should not be possible to create a game hash without providing 'purePassword' (126ms)
      ✓ game hash should match with soliditySha3 (80ms)
    function startGame()
      ✓ should not be possible to start a game when contract is paused (356ms)
      ✓ should not be possible to start a game without providing 'gameHash' (299ms)
      ✓ should not be possible to start a game without providing 'opponent' (221ms)
      ✓ should not be possible to start a game with the same gameHash (331ms)
      ✓ should not be possible to start a game if players funds are insufficient to games stake (265ms)
      ✓ should be possible to start a game by player1 with msg.value only (629ms)
    function participateGame()
      ✓ should not be possible to participate a game when contract is paused (510ms)
      ✓ should not be possible to participate a game without providing 'gameHash' (446ms)
      ✓ should not be possible to participate a game with an invalid 'bet' (1019ms)
      ✓ should not be possible to participate a game if game was not 'started' (123ms)
      ✓ should not be possible to participate a game by an attacker (115ms)
      ✓ should not be possible to participate a game if players funds are insufficient to games stake (117ms)
      ✓ should be possible to participate a game by player2 (260ms)
    function endGame()
      ✓ should not be possible to end a game when contract is paused (157ms)
      ✓ should not be possible to end a game when sending value (79ms)
      ✓ should not be possible to end a game with an invalid 'bet' (211ms)
      ✓ should not be possible to end a game when game status was not 'participated' (142ms)
      ✓ should not be possible to end a game by an attacker (85ms)
      ✓ should be possible to end a game by player1 (375ms)
    function retractGame()
      ✓ should not be possible to retract a game when contract is paused (240ms)
      ✓ should not be possible to retract a game when sending value (127ms)
      ✓ should not be possible to retract a game without providing 'gameHash' (171ms)
      ✓ should not be possible to retract a game when game is not started (177ms)
      ✓ should not be possible to retract a game when game has ended (322ms)
      ✓ should not be possible to retract a (started) game (by player1/player2) if deadline is not expired (431ms)
      ✓ should not be possible to retract a (started) game (by player2) (2514ms)
      ✓ should not be possible to retract a (started) game (by an attacker) (2238ms)
      ✓ should be possible to retract a (started) game (by player1) (2435ms)
      ✓ should not be possible to retract a (participated) game (by player1/player2) if deadline is not expired (360ms)
      ✓ should not be possible to retract a (participated) game (by player1) (2386ms)
      ✓ should not be possible to retract a (participated) game (by an attacker) (1938ms)
      ✓ should be possible to retract a (participated) game (by player2) (2373ms)
    rockPaperScissors game outcomes/flow:
      ✓ - draw (161ms)
      ✓ - player1 wins (149ms)
      ✓ -- should be possible to start a game by player1 with player stake only (791ms)
      ✓ - player2 wins (283ms)
      ✓ -- should not be possible to participate a game by player2 with player stake only if players funds are insufficient (500ms)
      ✓ -- should be possible to participate a game by player2 with player stake only (750ms)
    function withdraw()
      ✓ should not be possible to withdraw when contract is paused (183ms)
      ✓ should not be possible to withdraw by an attacker
      ✓ should be possible to withdraw by player (227ms)
    function setBlocksReactionTime()
      ✓ should not be possible to set new reaction time by an attacker
      ✓ should not be possible to set new reaction time to 0 (by owner)
      ✓ should be possible to set new reaction time (by owner) (251ms)


  53 passing (53s)
```