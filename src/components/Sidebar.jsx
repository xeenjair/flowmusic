import React from 'react';
import { FiHome, FiSearch, FiLibrary } from 'react-icons/fi';
import './Sidebar.css';

function Sidebar({ playlists, onPlaylistSelect }) {
  console.log('Sidebar received playlists:', playlists);

  return (
    <div className="sidebar">
      <div className="sidebar-nav">
        <button className="nav-item active">
          <FiHome />
          <span>Главная</span>
        </button>
        <button className="nav-item">
          <FiSearch />
          <span>Поиск</span>
        </button>
        <button className="nav-item">
          <FiLibrary />
          <span>Медиатека</span>
        </button>
      </div>

      <div className="sidebar-playlists">
        <div className="playlists-header">
          <h3>Ваши плейлисты</h3>
        </div>

        <div className="playlists-list">
          {playlists && playlists.length > 0 ? (
            playlists.map(playlist => (
              <button
                key={playlist.id}
                className="playlist-item"
                onClick={() => onPlaylistSelect(playlist.id)}
              >
                {playlist.cover && (
                  <img 
                    src={playlist.cover} 
                    alt={playlist.title} 
                    className="playlist-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/48';
                    }}
                  />
                )}
                <div className="playlist-info">
                  <div className="playlist-title">{playlist.title}</div>
                  <div className="playlist-meta">
                    {playlist.trackCount} треков • {playlist.owner}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="no-playlists">
              <p>Плейлисты не найдены</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;