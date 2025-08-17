import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  level: string;
  avatar: string;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries }) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-secondary-600">#{rank}</span>;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'advanced':
        return 'text-purple-600 bg-purple-100';
      case 'intermediate':
        return 'text-blue-600 bg-blue-100';
      case 'beginner':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-secondary-600 bg-secondary-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
      <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
        <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
        Leaderboard
      </h3>
      
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.rank} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8">
                {getRankIcon(entry.rank)}
              </div>
              
              <img
                src={entry.avatar}
                alt={entry.name}
                className="w-10 h-10 rounded-full"
              />
              
              <div>
                <p className="font-medium text-secondary-900">{entry.name}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${getLevelColor(entry.level)}`}>
                  {entry.level}
                </span>
              </div>
            </div>
            
            <div className="text-right">
              <p className="font-semibold text-primary-600">{entry.points.toLocaleString()}</p>
              <p className="text-xs text-secondary-600">points</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 