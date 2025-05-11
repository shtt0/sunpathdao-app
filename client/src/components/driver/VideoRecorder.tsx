import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { VideoRecordingData } from '@shared/types';
import { MAX_VIDEO_DURATION_SECONDS, VIDEO_MIME_TYPE } from '@/lib/constants';

interface VideoRecorderProps {
  onRecordingComplete: (data: VideoRecordingData) => void;
  onCancel: () => void;
}

export default function VideoRecorder({ onRecordingComplete, onCancel }: VideoRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [recordingEndTime, setRecordingEndTime] = useState<Date | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize camera when component mounts
  useEffect(() => {
    initCamera();
    
    // Cleanup function to release camera when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (videoURL) {
        URL.revokeObjectURL(videoURL);
      }
    };
  }, []);
  
  // Initialize camera
  const initCamera = async () => {
    try {
      // Request camera and microphone permissions
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setStream(mediaStream);
      
      // Set video source to camera stream
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Could not access your camera or microphone. Please check permissions.',
        variant: 'destructive',
      });
      
      // Let the parent component know we're canceling
      onCancel();
    }
  };
  
  // Start recording
  const startRecording = () => {
    if (!stream) {
      toast({
        title: 'Camera Error',
        description: 'Camera stream not available.',
        variant: 'destructive',
      });
      return;
    }
    
    // Reset chunks array
    chunksRef.current = [];
    
    // Create media recorder
    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: VIDEO_MIME_TYPE
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Event handler for data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      // Event handler for recording stopped
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: VIDEO_MIME_TYPE });
        const url = URL.createObjectURL(blob);
        
        setVideoURL(url);
        setRecordingBlob(blob);
        setIsRecording(false);
        
        // Set playback source to recording
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = url;
          videoRef.current.controls = true;
        }
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setRecordingStartTime(new Date());
      
      // Start timer to update recording time
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          // If we've reached the max recording time, stop recording
          if (prev >= MAX_VIDEO_DURATION_SECONDS) {
            stopRecording();
            return MAX_VIDEO_DURATION_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
      
      // Automatically stop recording after max duration
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, MAX_VIDEO_DURATION_SECONDS * 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording Error',
        description: 'Could not start recording.',
        variant: 'destructive',
      });
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecordingEndTime(new Date());
    }
  };
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  // Submit recording
  const handleSubmit = () => {
    if (!recordingBlob || !recordingStartTime || !recordingEndTime) {
      toast({
        title: 'Submission Error',
        description: 'No recording available to submit.',
        variant: 'destructive',
      });
      return;
    }
    
    // Calculate duration in seconds
    const duration = (recordingEndTime.getTime() - recordingStartTime.getTime()) / 1000;
    
    // Pass recording data to parent component
    onRecordingComplete({
      blob: recordingBlob,
      startTime: recordingStartTime,
      endTime: recordingEndTime,
      duration,
    });
  };
  
  // Restart recording
  const handleRestart = () => {
    // Clear previous recording
    if (videoURL) {
      URL.revokeObjectURL(videoURL);
    }
    
    setVideoURL(null);
    setRecordingBlob(null);
    setRecordingStartTime(null);
    setRecordingEndTime(null);
    setRecordingTime(0);
    
    // Reset video element to show camera
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.controls = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="h-full flex flex-col">
        <div className="flex-1 relative">
          {/* Video preview/playback area */}
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              className="h-full max-h-full max-w-full object-contain"
              autoPlay
              playsInline
              muted={isRecording} // Only mute during recording to prevent feedback
            />
            
            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-8 left-0 right-0 flex justify-center">
                <div className="bg-black bg-opacity-50 rounded-full px-4 py-2 text-white flex items-center">
                  <span className="animate-pulse mr-2 h-3 w-3 rounded-full bg-red-500"></span>
                  <span className="font-mono">
                    {formatTime(recordingTime)} / {formatTime(MAX_VIDEO_DURATION_SECONDS)}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Cancel button */}
          <div className="absolute top-8 left-8">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-neutral-800 text-white hover:bg-neutral-700"
              onClick={onCancel}
            >
              <span className="material-icons">close</span>
            </Button>
          </div>
        </div>
        
        {/* Bottom controls */}
        <div className="h-24 bg-neutral-900 flex items-center justify-center">
          {!isRecording && !videoURL && (
            <Button
              size="lg"
              className="rounded-full bg-red-500 hover:bg-red-600 h-16 w-16 flex items-center justify-center"
              onClick={startRecording}
            >
              <span className="material-icons">videocam</span>
            </Button>
          )}
          
          {isRecording && (
            <Button
              size="lg"
              className="rounded-full bg-red-500 hover:bg-red-600 h-16 w-16 flex items-center justify-center"
              onClick={stopRecording}
            >
              <span className="material-icons">stop</span>
            </Button>
          )}
          
          {videoURL && (
            <div className="flex space-x-4">
              <Button
                variant="outline"
                className="rounded-full border-white text-white hover:bg-neutral-800"
                onClick={handleRestart}
              >
                <span className="material-icons mr-2">replay</span>
                Record Again
              </Button>
              
              <Button
                className="rounded-full bg-green-600 hover:bg-green-700"
                onClick={handleSubmit}
              >
                <span className="material-icons mr-2">check</span>
                Submit Recording
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
