pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;
import "./VotingSystem.sol";
import "./DataTypes.sol";

/**
@title First Past the Post
@dev Implimentation of the VotingSystem interface
 */
contract FirstPastThePost is VotingSystem {
    /**
    @dev initializes FirstPastThePost contract by passing in an array of DataTypes.Candidate
    @param _candidate array of DataTypes.Candidate struct
     */
    constructor(DataTypes.Candidate[] memory _candidate) {
        for (uint256 i = 0; i < _candidate.length; i++) {
            candidates.push(_candidate[i]);
        }
    }

    /**
    @dev Calculates the winner under First Past the Post system
    @return winningCandidate Returns an array of the winning candidate(s) 
    (In case of ties, an array with the first 10 candidates with the lowest candidate id's that tied are returned)
    The array is padded with zeroes to be 10 in length. Excluding the padded zeroes, the array is sorted in ascending order
     */
    function calculate()
        external
        view
        override
        returns (uint256[10] memory winningCandidate)
    {
        uint256 winningVoteCount = 0;
        uint256 tempIndex = 0;
        for (uint256 i = 0; i < candidates.length; i++) {
            if (tempIndex > 10) {
                break;
            }
            if (candidates[i].voteCount > winningVoteCount) {
                winningVoteCount = candidates[i].voteCount;
                delete winningCandidate;
                tempIndex = 0;
                winningCandidate[tempIndex] = i;
            } else if (candidates[i].voteCount == winningVoteCount) {
                winningCandidate[tempIndex] = i;
                tempIndex++;
            }
        }
    }
}
