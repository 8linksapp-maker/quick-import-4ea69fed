import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PlayIcon, PauseIcon, Rewind10Icon, Forward10Icon, VolumeUpIcon, VolumeOffIcon, FullscreenIcon, MinimizeIcon } from './Icons';
import { supabase } from '../src/supabaseClient';

interface NetflixPlayerProps {
  url: string;
  shortTitle: string;
  longTitle: string;
}

const NetflixPlayer: React.FC<NetflixPlayerProps> = ({ url, shortTitle, longTitle }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [wasPlaying, setWasPlaying] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);
  const [isVolumeSliderVisible, setIsVolumeSliderVisible] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isHoveringProgressBar, setIsHoveringProgressBar] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeout = useRef<number | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;

    const generateAuthenticatedUrl = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // This could be handled more gracefully, e.g., showing an error message
          console.error("User not authenticated, cannot fetch video.");
          return;
        }

        const videoFile = url.substring(url.lastIndexOf('/') + 1);
        const encodedFile = btoa(videoFile);
        
        // Pass the user's auth token as a query parameter
        const proxyUrl = `/functions/v1/stream-video?file=${encodedFile}&token=${session.access_token}`;
        setVideoSrc(proxyUrl);

      } catch (error) {
        console.error("Error generating authenticated video URL:", error);
      }
    };

    generateAuthenticatedUrl();
    
  }, [url]);

  const formatTime = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      const paddedSeconds = String(remainingSeconds).padStart(2, '0');
      return `${minutes}:${paddedSeconds}`;
  };

  const handleVideoMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const handleVideoMouseLeave = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(e => console.error("Video play failed:", e));
        setShowControls(true);
      } else {
        videoRef.current.pause();
        setShowControls(true);
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
      setProgress((seekTime / duration) * 100);
    }
  };

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
  }, [isDragging, duration]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
        setIsDragging(false);
        if (wasPlaying) {
            videoRef.current!.play();
        }
    }
  }, [isDragging, wasPlaying]);

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

  const handleVolumeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVolumeDragging(true);
  };

  const handleVolumeMouseMove = useCallback((e: MouseEvent) => {
    const volumeBar = document.querySelector('.volume-bar-track');
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
  }, [isVolumeDragging]);

  const handleVolumeMouseUp = useCallback(() => {
    setIsVolumeDragging(false);
  }, []);

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
    if (hiddenVideoRef.current && canvasRef.current) {
        hiddenVideoRef.current.currentTime = seekTime;
        await new Promise((resolve) => {
            hiddenVideoRef.current!.onseeked = () => {
                resolve(true);
            };
        });
        const context = canvasRef.current.getContext('2d');
        if (context) {
            canvasRef.current.width = hiddenVideoRef.current.videoWidth;
            canvasRef.current.height = hiddenVideoRef.current.videoHeight;
            if (canvasRef.current.width === 0 || canvasRef.current.height === 0) {
                setThumbnailUrl(null);
                return;
            }
            try {
                context.drawImage(hiddenVideoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                const dataURL = canvasRef.current.toDataURL('image/jpeg', 0.8);
                setThumbnailUrl(dataURL);
            } catch (error) {
                setThumbnailUrl(null);
            }
        } else {
            setThumbnailUrl(null);
        }
    } else {
        setThumbnailUrl(null);
    }
  };
  
  const handleProgressBarMouseMove = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressBarRef.current && duration > 0 && !isDragging) {
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
      generateThumbnail(calculatedHoverTime);
    }
  };

  if (!videoSrc) {
    return (
      <div className="relative pt-[56.25%] bg-black flex justify-center items-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <>
    <div
        ref={playerContainerRef}
        className="relative pt-[56.25%] bg-black"
        onMouseMove={handleVideoMouseMove}
        onMouseLeave={handleVideoMouseLeave}
        onClick={handleTogglePlay}
        onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        // No crossOrigin attribute is needed when auth is in the URL
        className="absolute top-0 left-0 w-full h-full"
        onPlay={() => { setIsPlaying(true); setShowControls(false); }}
        onPause={() => { setIsPlaying(false); setShowControls(true); }}
        onVolumeChange={() => {
            if(videoRef.current){
                setIsMuted(videoRef.current.muted);
                setVolume(videoRef.current.volume);
            }
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {showControls && (
        <div 
          className="absolute bottom-0 left-0 w-full px-4 pt-8 pb-6 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleVideoMouseMove}
          onMouseLeave={handleVideoMouseLeave}
        >
        <div
            className="w-full relative mb-6"
        >
            <div 
                ref={progressBarRef}
                className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-8 cursor-pointer flex items-center"
                onClick={handleSeek}
                onMouseMove={handleProgressBarMouseMove}
                onMouseLeave={() => setIsHoveringProgressBar(false)}
            >
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
                            onMouseDown={handleMouseDown}
                        ></div>
                    </div>
                </div>
                {isHoveringProgressBar && (
                    <>
                        <div
                            className="absolute bottom-full mb-2 -translate-x-1/2"
                            style={{ left: `${hoverPosition}%` }}
                        >
                            {thumbnailUrl && (
                                <img src={thumbnailUrl} alt="Video preview" className="w-40 h-24 object-cover rounded shadow-lg" />
                            )}
                            <div className="absolute bottom-0 w-full text-center">
                                <div className="inline-block text-xs text-white bg-black/80 px-1 py-0.5 rounded">
                                    {formatTime(hoverTime)}
                                </div>
                            </div>
                        </div>
                        <div
                            className="absolute w-0.5 h-full bg-gray-300"
                            style={{ left: `${hoverPosition}%`, transform: 'translateX(-50%)' }}
                        ></div>
                    </>
                )}
            </div>
        </div>

        <div className="flex items-center justify-between gap-2 md:gap-4">
            {/* Left Controls */}
            <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
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

            {/* Center Title (Flexible) */}
            <div className="flex-1 min-w-0 text-center px-2">
                {/* Mobile Title */}
                <span className="truncate md:hidden text-white text-xs font-netflix-sans-medium block">
                    {shortTitle}
                </span>
                {/* Desktop Title */}
                <span className="truncate hidden md:block text-white text-lg font-netflix-sans-medium">
                    {longTitle}
                </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center flex-shrink-0">
                <button onClick={handleFullscreen} className="text-white p-2">
                    {isFullscreen ? <MinimizeIcon /> : <FullscreenIcon />}
                </button>
            </div>
        </div>

      </div>
      )}
      <>
        <video ref={hiddenVideoRef} src={videoSrc} style={{ visibility: 'hidden', position: 'absolute' }} preload="auto" muted />
        <canvas ref={canvasRef} style={{ visibility: 'hidden', position: 'absolute' }} />
      </>
    </div>
    </>
  );
};

export default NetflixPlayer;