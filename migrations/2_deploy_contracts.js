const RockPaperScissors = artifacts.require("RockPaperScissors");

module.exports = function (deployer, network, accounts) {
    console.log("  network:", network);

    const contractState = {
        paused: 0,
        running: 1,
        destroyed: 2,
    };

    const blocksReactionTime = '100';

    if(network === "ropsten"){
        //TODO
    }
    else if(network === "develop"){
        deployer.deploy(RockPaperScissors, contractState.running, blocksReactionTime, {from: accounts[0]});
    }
};