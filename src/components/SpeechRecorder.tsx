"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, Volume2, AlertCircle } from "lucide-react";

interface SpeechRecorderProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  currentText: string;
  expectedText: string;
  disabled?: boolean;
}

export default function SpeechRecorder({
  isRecording,
  onStartRecording,
  onStopRecording,
  currentText,
  expectedText,
  disabled = false,
}: SpeechRecorderProps) {
  const [recordingTime, setRecordingTime] = useState(0);

  // Track recording time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Expected Text Display */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Volume2 className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-600">
            Listen and repeat:
          </span>
        </div>
        <div className="text-lg font-medium text-gray-800 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
          "{expectedText}"
        </div>
      </div>

      {/* Recording Button */}
      <div className="text-center">
        <button
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={disabled}
          className={`flex items-center gap-3 px-8 py-4 rounded-full font-medium text-lg mx-auto transition-all duration-200 ${
            disabled
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : isRecording
              ? "bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transform hover:scale-105"
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-6 h-6" />
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <Mic className="w-6 h-6" />
              <span>Click to Record</span>
            </>
          )}
        </button>

        {/* Recording Timer */}
        {isRecording && (
          <div className="mt-3 text-sm font-medium text-red-600 animate-pulse">
            Recording: {formatRecordingTime(recordingTime)}
          </div>
        )}

        {disabled && (
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-500">
            <AlertCircle className="w-4 h-4" />
            <span>Wait for video to pause before recording</span>
          </div>
        )}
      </div>

      {/* Current Recognition Display */}
      {currentText && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">
              What you said:
            </span>
          </div>
          <p className="text-lg italic text-gray-800 leading-relaxed">
            "{currentText}"
          </p>
        </div>
      )}

      {/* Recording Tips */}
      {!isRecording && !currentText && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Recording Tips:</p>
              <ul className="space-y-1 text-xs">
                <li>• Speak clearly and at normal speed</li>
                <li>• Try to match the pronunciation and rhythm</li>
                <li>• Make sure your microphone is enabled</li>
                <li>• Reduce background noise for better accuracy</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
