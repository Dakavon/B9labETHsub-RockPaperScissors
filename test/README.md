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
      ✓ should not be possible to start RockPaperScissors as 'destroyed' (3992ms)
      ✓ should not be possible to start RockPaperScissors with invalid 'blocksReactionTime' (617ms)
      ✓ should not be possible to send value to constructor (485ms)
      ✓ should be possible to start RockPaperScissors as 'paused' (594ms)
      ✓ should be possible to start RockPaperScissors as 'running' (589ms)
      ✓ blocksReactionTime should be stored correctly (672ms)
      ✓ game outcomes should be stored correctly (1772ms)
    function createGameHash()
      ✓ should not be possible to create a game hash with an invalid 'bet' (210ms)
      ✓ should not be possible to create a game hash without providing 'purePassword' (94ms)
      ✓ game hash should match with soliditySha3 (261ms)
    function startGame()
      ✓ should not be possible to start a game when contract is paused (659ms)
      ✓ should not be possible to start a game without providing 'gameHash' (206ms)
      ✓ should not be possible to start a game without providing 'opponent' (202ms)
      ✓ should not be possible to start a game with the same gameHash (638ms)
      ✓ should be possible to start a game by player1 with msg.value (647ms)
    function participateGame()
      ✓ should not be possible to participate a game when contract is paused (844ms)
      ✓ should not be possible to participate a game without providing 'gameHash' (652ms)
      ✓ should not be possible to participate a game with an invalid 'bet' (439ms)
      ✓ should not be possible to participate a game if game was not 'started' (149ms)
      ✓ should not be possible to participate a game by an attacker (247ms)
      ✓ should not be possible to participate a game if msg.value is not equal to games stake (131ms)
      ✓ should be possible to participate a game by player2 (374ms)
    function endGame()
      ✓ should not be possible to end a game when contract is paused (395ms)
      ✓ should not be possible to end a game when sending value (279ms)
      ✓ should not be possible to end a game with an invalid 'bet' (596ms)
      ✓ should not be possible to end a game when game status was not 'participated' (252ms)
      ✓ should not be possible to end a game by an attacker (219ms)
      ✓ should be possible to end a game by player1 (805ms)
    function retractGame()
      ✓ should not be possible to retract a game when contract is paused (227ms)
      ✓ should not be possible to retract a game when sending value (237ms)
      ✓ should not be possible to retract a game without providing 'gameHash' (299ms)
      ✓ should not be possible to retract a game when game is not started (446ms)
      ✓ should not be possible to retract a game when game has ended (1908ms)
      ✓ should not be possible to retract a (started) game (by player1/player2) if deadline is not expired (501ms)
      ✓ should not be possible to retract a (started) game (by player2) (3966ms)
      ✓ should not be possible to retract a (started) game (by an attacker) (2659ms)
      ✓ should be possible to retract a (started) game (by player1) (2089ms)
      ✓ should not be possible to retract a (participated) game (by player1/player2) if deadline is not expired (406ms)
      ✓ should not be possible to retract a (participated) game (by player1) (2312ms)
      ✓ should not be possible to retract a (participated) game (by an attacker) (2991ms)
      ✓ should be possible to retract a (participated) game (by player2) (2177ms)
    rockPaperScissors game outcomes/flow:
      ✓ - draw (164ms)
      ✓ - player1 wins (275ms)
      ✓ -- should not be possible to start a game by player1 with player stake when sending value (230ms)
      ✓ -- should be possible to start a game by player1 with player stake (1209ms)
      ✓ - player2 wins (373ms)
      ✓ -- should not be possible to participate a game by player2 with player stake when sending value (592ms)
      ✓ -- should not be possible to participate a game by player2 with player stake when amount insufficient (421ms)
      ✓ -- should be possible to participate a game by player2 with player stake (772ms)
    function withdraw()
      ✓ should not be possible to withdraw when contract is paused (163ms)
      ✓ should not be possible to withdraw by an attacker
      ✓ should be possible to withdraw by player (428ms)
    function setBlocksReactionTime()
      ✓ should not be possible to set new reaction time by an attacker
      ✓ should not be possible to set new reaction time to 0 (by owner)
      ✓ should be possible to set new reaction time (by owner) (711ms)


  55 passing (1m)
```