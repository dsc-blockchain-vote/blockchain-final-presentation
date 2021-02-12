pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;
import "./VotingSystem.sol";
import "./FirstPastThePost.sol";
import {DataTypes} from "./DataTypes.sol";

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
    @dev checks whether the sender of the request is the organizer or not
     */
    modifier onlyHost() {
        require(msg.sender == organizer);
        _;
    }

    /**
    @dev checks whether the sender made the request within the given endtime
     */
    modifier onlyWhileOpen() {
        require(block.timestamp < endTime);
        require(block.timestamp >= startTime);
        _;
    }

    /**
    @dev initilazes the Election by storing the candidates and start, end time
    @param candidateNames array of strings containing the candidate names
    @param endTime_ uint storing the end time in epoch seconds
    @param startTime_ uint storing the start time in epoch seconds
     */
    constructor(
        string[] memory candidateNames,
        uint256 endTime_,
        uint256 startTime_
    ) {
        votingType = votingTypes.firstPastThePost;
        organizer = msg.sender;
        endTime = endTime_;
        startTime = startTime_;
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
    @param voterAddress address of the voter account
     */
    function giveRightToVote(address voterAddress) public onlyHost {
        voters[voterAddress].validVoter = true;
    }

    /**
    @dev allow valid voter to caste their votes
    @param candidateID unint representing the candidate who got the vote
     */
    function vote(uint256 candidateID) public onlyWhileOpen {
        DataTypes.Voter storage sender = voters[msg.sender];
        require(sender.validVoter, "Has no right to vote");
        require(!sender.voted, "Already voted.");
        sender.voted = true;
        sender.votedFor = candidateID;
        candidates[candidateID].voteCount += 1;
    }

    /**
    @dev calculate the winning candidate according to the choosen voting system
    @return winningCandidate_ the id of the winner candidate
     */
    function winningCandidate() public returns (uint256 winningCandidate_) {
        FirstPastThePost countMethod = new FirstPastThePost(candidates);
        winningCandidate_ = countMethod.calculate();
    }

    /**
    @dev returns the winning candidate name
     */
    function winnerName() public returns (string memory winnerName_) {
        winnerName_ = candidates[winningCandidate()].name;
    }
}
