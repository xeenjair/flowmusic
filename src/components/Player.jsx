import React from 'react';
import { 
  FiPlay, 
  FiPause, 
  FiSkipBack, 
  FiSkipForward,
  FiVolume2,
  FiHeart,
  FiRepeat,
  FiShuffle
} from 'react-icons/fi';
import './Player.css';

function Player({ currentTrack, isPlaying, onPlayPause }) {
  if (!currentTrack) {
    return (
      <div className="player">
        <div className="player-empty">Выберите трек для воспроизведения</div>
      </div>
    );
  }

  return (
    <div className="player">
      <div className="player-left">
        <img src={currentTrack.cover || '/default-cover.png'} alt={currentTrack.title} />
        <div className="track-info">
          <div className="track-title">{currentTrack.title}</div>
          <div className="track-artist">{currentTrack.artists}</div>
        </div>
        <button className="like-button">
          <FiHeart />
        </button>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button className="control-button">
            <FiShuffle />
          </button>
          <button className="control-button">
            <FiSkipBack />
          </button>
          <button className="play-button" onClick={onPlayPause}>
            {isPlaying ? <FiPause /> : <FiPlay />}
          </button>
          <button className="control-button">
            <FiSkipForward />
          </button>
          <button className="control-button">
            <FiRepeat />
          </button>
        </div>
        
        <div className="progress-bar">
          <span className="time">0:00</span>
          <div className="progress-slider">
            <div className="progress-filled" style={{ width: '0%' }}></div>
            <div className="progress-handle"></div>
          </div>
          <span className="time">
            {Math.floor(currentTrack.duration / 60000)}:
            {String(Math.floor((currentTrack.duration % 60000) / 1000)).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="player-right">
        <button className="volume-button">
          <FiVolume2 />
        </button>
        <div className="volume-slider">
          <div className="volume-filled" style={{ width: '70%' }}></div>
          <div className="volume-handle" style={{ left: '70%' }}></div>
        </div>
      </div>
    </div>
  );
}

export default Player;