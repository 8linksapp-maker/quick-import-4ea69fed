import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PlayIcon, PauseIcon, Rewind10Icon, Forward10Icon, VolumeUpIcon, VolumeOffIcon, FullscreenIcon, MinimizeIcon } from './Icons';

interface NetflixPlayerProps {
  url: string;
  title: string;
}

const NetflixPlayer: React.FC<NetflixPlayerProps> = ({ url, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null); // Ref para o container do player
  const hiddenVideoRef = useRef<HTMLVideoElement>(null); // For thumbnail generation
  const canvasRef = useRef<HTMLCanvasElement>(null); // For thumbnail generation

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false); // Estado para tela cheia
  
  const [isDragging, setIsDragging] = useState(false);
  const [wasPlaying, setWasPlaying] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);
  const [isVolumeSliderVisible, setIsVolumeSliderVisible] = useState(false);

  const [hoverTime, setHoverTime] = useState(0);
  const [hoverPosition, setHoverPosition] = useState(0); // in percentage
  const [isHoveringProgressBar, setIsHoveringProgressBar] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const [showControls, setShowControls] = useState(true); // Controls visibility
  const hideControlsTimeout = useRef<number | null>(null); // Ref for timeout ID

  // Helper function to format time (e.g., 125 seconds -> "02:05")
  const formatTime = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      const paddedSeconds = String(remainingSeconds).padStart(2, '0');
      return `${minutes}:${paddedSeconds}`;
  };

  // --- Controls Auto-hide Logic ---
  const handleVideoMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3000); // Hide after 3 seconds of inactivity
  }, []);

  const handleVideoMouseLeave = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3000); // Hide after 3 seconds of inactivity
  }, []);
  // --- End Controls Auto-hide Logic ---


  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setShowControls(true); // Show controls on play
      } else {
        videoRef.current.pause();
        setShowControls(true); // Show controls on pause
      }
    }
  };
  
  const handleRewind = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };
  
  const handleForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
    }
  };

  const handleToggleMute = () => {
      if (videoRef.current) {
          videoRef.current.muted = !videoRef.current.muted;
          setIsMuted(videoRef.current.muted);
      }
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const volumeBar = e.currentTarget;
    const rect = volumeBar.getBoundingClientRect();
    const clickPositionInBar = rect.bottom - e.clientY;
    const barHeight = rect.height;
    let newVolume = clickPositionInBar / barHeight;

    if (newVolume < 0) newVolume = 0;
    if (newVolume > 1) newVolume = 1;

    if (videoRef.current) {
        videoRef.current.volume = newVolume;
        setVolume(newVolume);
        if (newVolume > 0 && videoRef.current.muted) {
            videoRef.current.muted = false;
            setIsMuted(false);
        }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setVolume(videoRef.current.volume);
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isDragging) {
      const progressPercent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progressPercent);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging && progressBarRef.current && videoRef.current) {
      const bar = progressBarRef.current;
      const clickPositionInBar = e.clientX - bar.getBoundingClientRect().left;
      const barWidth = bar.clientWidth;
      const seekTime = (clickPositionInBar / barWidth) * duration;
      videoRef.current.currentTime = seekTime;
      // Manually update progress for immediate visual feedback
      setProgress((seekTime / duration) * 100);
    }
  };

  // --- Progress Bar Drag Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setWasPlaying(!videoRef.current!.paused);
    videoRef.current!.pause();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && progressBarRef.current && videoRef.current) {
      const bar = progressBarRef.current;
      const movePosition = e.clientX - bar.getBoundingClientRect().left;
      const barWidth = bar.clientWidth;
      let newProgress = (movePosition / barWidth) * 100;
      if (newProgress < 0) newProgress = 0;
      if (newProgress > 100) newProgress = 100;
      setProgress(newProgress);
      videoRef.current.currentTime = (newProgress / 100) * duration;
    }
  }, [isDragging, duration]); // Depend on isDragging and duration

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
        setIsDragging(false);
        if (wasPlaying) {
            videoRef.current!.play();
        }
    }
  }, [isDragging, wasPlaying]); // Depend on isDragging and wasPlaying

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);


  // --- Volume Bar Drag Logic ---
  const handleVolumeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVolumeDragging(true);
  };

  const handleVolumeMouseMove = useCallback((e: MouseEvent) => {
    const volumeBar = document.querySelector('.volume-bar-track'); // Need a stable selector for the volume bar track
    if (isVolumeDragging && volumeBar && videoRef.current) {
        const rect = volumeBar.getBoundingClientRect();
        const movePosition = rect.bottom - e.clientY;
        const barHeight = rect.height;
        let newVolume = movePosition / barHeight;
        if (newVolume < 0) newVolume = 0;
        if (newVolume > 1) newVolume = 1;
        
        videoRef.current.volume = newVolume;
        setVolume(newVolume);
        if (videoRef.current.muted && newVolume > 0) {
            videoRef.current.muted = false;
            setIsMuted(false);
        }
    }
  }, [isVolumeDragging]); // Depend on isVolumeDragging

  const handleVolumeMouseUp = useCallback(() => {
    setIsVolumeDragging(false);
  }, []); // No dependencies, just set state

  useEffect(() => {
    if (isVolumeDragging) {
      window.addEventListener('mousemove', handleVolumeMouseMove);
      window.addEventListener('mouseup', handleVolumeMouseUp);
    } else {
      window.removeEventListener('mousemove', handleVolumeMouseMove);
      window.removeEventListener('mouseup', handleVolumeMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleVolumeMouseMove);
      window.removeEventListener('mouseup', handleVolumeMouseUp);
    };
  }, [isVolumeDragging, handleVolumeMouseMove, handleVolumeMouseUp]);

  const handleFullscreen = () => {
    if (playerContainerRef.current) {
      if (!document.fullscreenElement) {
        playerContainerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  const generateThumbnail = async (seekTime: number) => {
    // console.log('generateThumbnail called for seekTime:', seekTime);
    if (hiddenVideoRef.current && canvasRef.current) {
        // console.log('Hidden video and canvas refs are available.');
        hiddenVideoRef.current.currentTime = seekTime;
        // console.log('Hidden video seeked to:', seekTime);

        // Wait for video to be seeked
        await new Promise((resolve) => {
            hiddenVideoRef.current!.onseeked = () => {
                // console.log('Hidden video onseeked fired, resolving...');
                resolve(true);
            };
        });
        // console.log('Hidden video seeked and ready for drawing.');


        const context = canvasRef.current.getContext('2d');
        if (context) {
            canvasRef.current.width = hiddenVideoRef.current.videoWidth;
            canvasRef.current.height = hiddenVideoRef.current.videoHeight;
            // console.log('Canvas dimensions:', canvasRef.current.width, canvasRef.current.height);

            if (canvasRef.current.width === 0 || canvasRef.current.height === 0) {
                // console.error('Canvas dimensions are zero, cannot draw thumbnail.');
                setThumbnailUrl(null); // Clear any old thumbnail
                return;
            }

            try {
                context.drawImage(hiddenVideoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                const dataURL = canvasRef.current.toDataURL('image/jpeg', 0.8); // Specify format and quality
                // console.log('Thumbnail dataURL generated, length:', dataURL.length);
                setThumbnailUrl(dataURL);
            } catch (error) {
                // console.error('Error generating thumbnail (likely CORS issue):', error);
                setThumbnailUrl(null);
            }
        } else {
            // console.error('Could not get 2D context for canvas.');
            setThumbnailUrl(null);
        }
    } else {
        // console.log('Hidden video or canvas refs not available yet.');
        setThumbnailUrl(null);
    }
  };
  
  const handleProgressBarMouseMove = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressBarRef.current && duration > 0 && !isDragging) { // Added !isDragging condition
      setIsHoveringProgressBar(true);
      const bar = progressBarRef.current;
      const mouseX = e.clientX - bar.getBoundingClientRect().left;
      const barWidth = bar.clientWidth;
      let newHoverPosition = (mouseX / barWidth) * 100;
      if (newHoverPosition < 0) newHoverPosition = 0;
      if (newHoverPosition > 100) newHoverPosition = 100;
      setHoverPosition(newHoverPosition);
      const calculatedHoverTime = (newHoverPosition / 100) * duration;
      setHoverTime(calculatedHoverTime);

      // Generate thumbnail
      generateThumbnail(calculatedHoverTime);
    } else if (isDragging) {
        // Do nothing if dragging the main progress bar
    }
  }; // Fechamento CORRETO da função handleProgressBarMouseMove
  return (
    <>
    <div
        ref={playerContainerRef}
        className="relative pt-[56.25%] bg-black" // Removed cursor-pointer from here as it's on the clickable area
        onMouseMove={handleVideoMouseMove}
        onMouseLeave={handleVideoMouseLeave}
        onClick={handleTogglePlay}
    >
      <video
        ref={videoRef}
        src={url}
        className="absolute top-0 left-0 w-full h-full"
        onPlay={() => { setIsPlaying(true); setShowControls(false); }} // Hide controls on play
        onPause={() => { setIsPlaying(false); setShowControls(true); }} // Show controls on pause
        onVolumeChange={() => {
            if(videoRef.current){
                setIsMuted(videoRef.current.muted);
                setVolume(videoRef.current.volume);
            }
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
      
      {/* Custom Controls Overlay */}
      {showControls && ( // Conditionally render the controls overlay
        <div 
          className="absolute bottom-0 left-0 w-full px-4 pt-8 pb-6 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300" // Added transition
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleVideoMouseMove} // Keep controls visible when hovering over them
          onMouseLeave={handleVideoMouseLeave} // Hide controls when mouse leaves controls
        >
        {/* Progress Bar */}
        <div
            className="w-full relative mb-6" // Container for the entire progress bar interaction
        >
            {/* Invisible larger clickable area */}
            <div 
                ref={progressBarRef} // Ref on the interaction layer
                className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-8 cursor-pointer flex items-center" // Added flex items-center
                onClick={handleSeek}
                onMouseMove={handleProgressBarMouseMove}
                onMouseLeave={() => setIsHoveringProgressBar(false)} // Hides hover info when mouse leaves clickable area
            >
                {/* Visual Progress Bar (h-1) */}
                <div 
                    className="w-full h-1 bg-gray-500/50 relative"
                >
                    <div 
                        className="h-full bg-red-600 relative"
                        style={{ width: `${progress}%` }}
                    >
                        <div 
                            className="w-3.5 h-3.5 bg-red-600 rounded-full absolute right-0 top-1/2 cursor-grab"
                            style={{ transform: 'translate(50%, -50%)' }}
                            onMouseDown={handleMouseDown} // Handle drag starts here
                        ></div>
                    </div>
                </div>
                {isHoveringProgressBar && (
                    <>
                        <div
                            className="absolute bottom-full mb-2 -translate-x-1/2" // Position above the bar
                            style={{ left: `${hoverPosition}%` }}
                        >
                            {/* Thumbnail */}
                            {thumbnailUrl && (
                                <img src={thumbnailUrl} alt="Video preview" className="w-40 h-24 object-cover rounded shadow-lg" />
                            )}
                            {/* Timestamp below thumbnail */}
                            <div className="absolute bottom-0 w-full text-center">
                                <div className="inline-block text-xs text-white bg-black/80 px-1 py-0.5 rounded">
                                    {formatTime(hoverTime)}
                                </div>
                            </div>
                        </div>
                        {/* Vertical scrubbing line */}
                        <div
                            className="absolute w-0.5 h-full bg-gray-300" // Vertical scrubbing line
                            style={{ left: `${hoverPosition}%`, transform: 'translateX(-50%)' }}
                        ></div>
                    </>
                )}
            </div>
        </div>

        {/* Control Icons */}
        <div className="relative flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center space-x-4">
                <button onClick={handleTogglePlay} className="text-white p-2">
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button onClick={handleRewind} className="text-white p-2">
                    <Rewind10Icon />
                </button>
                <button onClick={handleForward} className="text-white p-2">
                    <Forward10Icon />
                </button>
                <div 
                    className="relative"
                    onMouseEnter={() => setIsVolumeSliderVisible(true)}
                    onMouseLeave={() => { if (!isVolumeDragging) setIsVolumeSliderVisible(false); }}
                >
                    <button onClick={handleToggleMute} className="text-white p-2">
                        {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
                    </button>
                    {isVolumeSliderVisible && (
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 p-2 bg-black bg-opacity-70 rounded-md">
                            <div
                                className="volume-bar-track w-1.5 h-20 bg-gray-500/50 rounded-full flex flex-col-reverse cursor-pointer"
                                onClick={handleVolumeChange}
                            >
                                <div className="bg-red-600 rounded-full w-full relative" style={{ height: `${volume * 100}%` }}>
                                    <div 
                                        className="w-3.5 h-3.5 bg-red-600 rounded-full absolute left-1/2 -translate-x-1/2 -top-1.5 cursor-grab"
                                        onMouseDown={handleVolumeMouseDown}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Center Controls (Title) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 w-1/2 text-center">
                <span className="text-white text-lg font-netflix-sans-medium truncate">
                    {title}
                </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center space-x-4"> {/* Adicionado flex e space-x-2 para organizar o botão */}
                {/* TODO: Add Next, List, etc. */}
                <button onClick={handleFullscreen} className="text-white p-2">
                    {isFullscreen ? <MinimizeIcon /> : <FullscreenIcon />}
                </button>
            </div>
        </div>

      </div>
      )}
      {/* Fragmento para hiddenVideoRef e canvasRef */}
      <>
        <video ref={hiddenVideoRef} src={url} style={{ visibility: 'hidden', position: 'absolute' }} preload="auto" muted crossOrigin="anonymous" />
        <canvas ref={canvasRef} style={{ visibility: 'hidden', position: 'absolute' }} />
      </>
    </div>
    </>
  );};

export default NetflixPlayer;