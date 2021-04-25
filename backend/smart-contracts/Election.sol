    pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;
import "./VotingSystem.sol";
import "./FirstPastThePost.sol";
import "./DataTypes.sol";

/**
@title Election
@dev Main contract used to set up and participate in the election on the blockchain
 */
contract Election {
    DataTypes.Candidate[] public candidates;

    enum votingTypes {firstPastThePost}
    votingTypes votingType;

    uint256 public endTime;
    uint256 public startTime;

    address public organizer;

    mapping(address => DataTypes.Voter) public voters;

    /**
    @dev checks if the sender of the request is the organizer
     */
    modifier onlyHost() {
        require(msg.sender == organizer);
        _;
    }

    /**
    @dev checks if the sender made the request while the election was occuring
     */

    modifier onlyDuringElection() {
        require(block.timestamp < endTime, "Election has ended");
        require(block.timestamp >= startTime, "Election has started");
        _;
    }

    /**
    @dev checks if the sender made the request before the election started
     */
    modifier onlyBeforeElection() {
        require(block.timestamp < startTime, "Election start time has passed");
        _;
    }

    /**
    @dev checks if the sender made the request after the election ended
     */
    modifier onlyAfterElection() {
        require(block.timestamp > endTime, "Election end time has not passed");
        _;
    }

    /**
    @dev initilazes the Election by storing the candidates and start, end time
    @param candidateNames array of strings containing the candidate names
    @param _endTime uint storing the end time in epoch seconds
    @param _startTime uint storing the start time in epoch seconds
     */
    constructor(
        string[] memory candidateNames,
        uint256 _endTime,
        uint256 _startTime
    ) {
        votingType = votingTypes.firstPastThePost;
        organizer = msg.sender;
        endTime = _endTime;
        startTime = _startTime;
        for (uint256 i = 0; i < candidateNames.length; i++) {
            candidates.push(
                DataTypes.Candidate({
                    name: candidateNames[i],
                    voteCount: 0,
                    id: i
                })
            );
        }
    }

    /**
    @dev allows the organizer to give voting privilege to a voter
    @param voterAddress an array of voter account addresses
     */
    function giveRightToVote(address[] memory voterAddress) public onlyHost {
        for (uint256 i = 0; i < voterAddress.length; i++) {
            voters[voterAddress[i]].validVoter = true;
        }
    }

    /**
    @dev allow valid voter to cast their vote
    @param candidateID unint representing the candidate who got the vote
     */
    function vote(uint256 candidateID) public onlyDuringElection {
        require(voters[msg.sender].validVoter, "Has no right to vote");
        require(!voters[msg.sender].voted, "Already voted.");
        voters[msg.sender].voted = true;
        voters[msg.sender].votedFor = candidateID;
        candidates[candidateID].voteCount += 1;
    }   

    /**
    @dev calculate the winning candidate(s) according to the chosen voting system
    @return winnerName a string containing the winning candidate(s) name(s). In case of a tie(s), 
    the names are seperated by a comma
     */


    function getWinner()
        public
        onlyAfterElection
        returns (string memory winnerName)
    {
        FirstPastThePost countMethod = new FirstPastThePost(candidates);
        // Winners is an array of winning candidate id's with the winning candidate(s)
        // The array is padded with zeroes to contain 10 integers.
        // Excluding the padded zeroes, the array is sorted in ascending order 
        // if the id at a non zero index is zero, then the previous index contains the last candidate that tied
        
        uint256[10] memory winners = countMethod.calculate();
        winnerName = string(candidates[winners[0]].name);
        for (uint256 i = 1; i < winners.length; i++) {
            // abi.encodePacked(arg) is an ABI encoding function that concatinates 2 strings together;
            
            // if the id at the index is a padded id, then the code has finished iterating through all the candidates
            if (winners[i] == 0 && i != 0) {
                break;
            }
            winnerName = string(
                abi.encodePacked(winnerName, ",", candidates[winners[i]].name)
            );
        }
    }



    /**
    @dev get the number of candidates in the election
    @return num the number of candidates in the election
     */
    function numberOfCandidates() public view returns (uint256 num) {
        num = candidates.length;
        return num;
    }
}
