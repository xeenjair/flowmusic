import HomeSvg from '../../assets/icons/home.svg';
import SearchSvg from '../../assets/icons/search.svg';
import LyricsSvg from '../../assets/icons/lyrics.svg';
import PlaySvg from '../../assets/icons/play.svg';
import PauseSvg from '../../assets/icons/pause.svg';
import NextSvg from '../../assets/icons/next.svg';
import PrevSvg from '../../assets/icons/prev.svg';
import VolumeSvg from '../../assets/icons/volume.svg';
import HeartSvg from '../../assets/icons/heart.svg';
import HeartFilledSvg from '../../assets/icons/heart-filled.svg';
import SettingsSvg from '../../assets/icons/settings.svg';
import CloseSvg from '../../assets/icons/close.svg';
import AddSvg from '../../assets/icons/add.svg';
import DeleteSvg from '../../assets/icons/delete.svg';
import NoteSvg from '../../assets/icons/note.svg';
import HistorySvg from '../../assets/icons/history.svg';
import PlaylistSvg from '../../assets/icons/playlist.svg';
import MixSvg from '../../assets/icons/mix.svg';
import RepeatSvg from '../../assets/icons/repeat.svg';
import SpeakerSvg from '../../assets/icons/speaker.svg';
import TimeSvg from '../../assets/icons/time.svg';

export const HomeIcon = ({ className, size = 24 }) => (
  <img src={HomeSvg} alt="Home" className={className} width={size} height={size} />
);

export const SearchIcon = ({ className, size = 24 }) => (
  <img src={SearchSvg} alt="Search" className={className} width={size} height={size} />
);

export const LyricsIcon = ({ className, size = 24 }) => (
  <img src={LyricsSvg} alt="Lyrics" className={className} width={size} height={size} />
);

export const PlayIcon = ({ className, size = 24 }) => (
  <img src={PlaySvg} alt="Play" className={className} width={size} height={size} />
);

export const PauseIcon = ({ className, size = 24 }) => (
  <img src={PauseSvg} alt="Pause" className={className} width={size} height={size} />
);

export const NextIcon = ({ className, size = 24 }) => (
  <img src={NextSvg} alt="Next" className={className} width={size} height={size} />
);

export const PrevIcon = ({ className, size = 24 }) => (
  <img src={PrevSvg} alt="Previous" className={className} width={size} height={size} />
);

export const VolumeIcon = ({ className, size = 24 }) => (
  <img src={VolumeSvg} alt="Volume" className={className} width={size} height={size} />
);

export const HeartIcon = ({ className, size = 20, filled = false }) => (
  <img src={filled ? HeartFilledSvg : HeartSvg} alt="Favorite" className={className} width={size} height={size} />
);

export const SettingsIcon = ({ className, size = 24 }) => (
  <img src={SettingsSvg} alt="Settings" className={className} width={size} height={size} />
);

export const CloseIcon = ({ className, size = 24 }) => (
  <img src={CloseSvg} alt="Close" className={className} width={size} height={size} />
);

export const AddIcon = ({ className, size = 24 }) => (
  <img src={AddSvg} alt="Add" className={className} width={size} height={size} />
);

export const DeleteIcon = ({ className, size = 24 }) => (
  <img src={DeleteSvg} alt="Delete" className={className} width={size} height={size} />
);

export const NoteIcon = ({ className, size = 24 }) => (
  <img src={NoteSvg} alt="Note" className={className} width={size} height={size} />
);

export const HistoryIcon = ({ className, size = 24 }) => (
  <img src={HistorySvg} alt="History" className={className} width={size} height={size} />
);

export const PlaylistIcon = ({ className, size = 24 }) => (
  <img src={PlaylistSvg} alt="Playlist" className={className} width={size} height={size} />
);

export const MixIcon = ({ className, size = 24 }) => (
  <img src={MixSvg} alt="Shuffle" className={className} width={size} height={size} />
);

export const RepeatIcon = ({ className, size = 24 }) => (
  <img src={RepeatSvg} alt="Repeat" className={className} width={size} height={size} />
);

export const SpeakerIcon = ({ className, size = 24 }) => (
  <img src={SpeakerSvg} alt="Playing" className={className} width={size} height={size} />
);

export const TimeIcon = ({ className, size = 24 }) => (
  <img src={TimeSvg} alt="Duration" className={className} width={size} height={size} />
);