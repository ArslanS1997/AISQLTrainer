import React, { useState } from 'react';
import { Button } from './Button';
import { SQLEditor } from './SQLEditor';
import { QueryResultViewer } from './QueryResultViewer';
import { CheckCircle, XCircle, Loader, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Difficulty } from '../types';

interface QuestionCardProps {
  question: string;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string) => Promise<{ success: boolean; feedback: string }>;
  onNext: () => void;
  isLastQuestion: boolean;
  sessionId?: string;
  difficulty: Difficulty; // Added difficulty prop
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onNext,
  isLastQuestion,
  sessionId,
  difficulty // Added difficulty prop
}) => {
  const { user } = useAuth();
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    feedback: string;
    showFeedback: boolean;
    tableHeader?: string;
    points?: number;
  } | null>(null);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    
    setIsSubmitting(true);
    try {
      // Use the is_correct API directly for better feedback
      if (sessionId && user) {
        const response = await apiClient.checkAnswer({
          user_id: user.id,
          session_id: sessionId,
          question: question,
          sql: answer,
          difficulty: difficulty // Add this line
        });

        if (response.data) {
          setResult({
            success: response.data.is_correct,
            feedback: response.data.explanation,
            showFeedback: true,
            tableHeader: response.data.table_head,
            points: response.data.points
          });
        } else {
          throw new Error(response.error || 'Failed to check answer');
        }
      } else {
        // Fallback to the old method
        const response = await onAnswer(answer);
        setResult({
          success: response.success,
          feedback: response.feedback,
          showFeedback: true
        });
      }
    } catch (error) {
      setResult({
        success: false,
        feedback: 'An error occurred while checking your answer.',
        showFeedback: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setAnswer('');
    setResult(null);
    onNext();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-4xl mx-auto">
      {/* Question Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-100 text-primary-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
            {questionNumber}
          </div>
          <span className="text-sm text-gray-500">
            Question {questionNumber} of {totalQuestions}
          </span>
        </div>
        {result && (
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            result.success 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {result.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span>{result.success ? 'Correct' : 'Incorrect'}</span>
          </div>
        )}
      </div>

      {/* Question Text */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Question:</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-800 leading-relaxed">{question}</p>
        </div>
      </div>

      {/* SQL Answer Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Your SQL Answer:
        </label>
        <SQLEditor
          value={answer}
          onChange={setAnswer}
          placeholder="Write your SQL query here..."
          rows={12}
          className="w-full"
          disabled={result !== null}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          {!result && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !answer.trim()}
              className="flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Submit Answer</span>
                </>
              )}
            </Button>
          )}
        </div>

        {result && (
          <Button
            onClick={handleNext}
            className="flex items-center space-x-2"
          >
            {isLastQuestion ? (
              <>
                <span>Finish Practice</span>
              </>
            ) : (
              <>
                <span>Next Question</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Query Results and Feedback */}
      {result?.showFeedback && (
        <div className="mt-6">
          <QueryResultViewer
            tableHeader={result.tableHeader}
            isCorrect={result.success}
            explanation={result.feedback}
          />
          
          {/* Points display */}
          {result.points !== undefined && (
            <div className={`mt-4 p-3 rounded-lg border text-center ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-center space-x-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={`font-medium ${
                  result.success ? 'text-green-800' : 'text-gray-700'
                }`}>
                  {result.success ? `+${result.points} points earned!` : `0 points (try again)`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 