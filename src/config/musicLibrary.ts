export interface Song {
  id: string;
  title: string;
  artist: string;
  genre: string;
  duration: string;
  preview?: string; // URL placeholder
}

export const musicLibrary: Song[] = [
  // Pop
  { id: "1", title: "Blinding Lights", artist: "The Weeknd", genre: "Pop", duration: "3:20" },
  { id: "2", title: "Levitating", artist: "Dua Lipa", genre: "Pop", duration: "3:23" },
  { id: "3", title: "Anti-Hero", artist: "Taylor Swift", genre: "Pop", duration: "3:21" },
  { id: "4", title: "Flowers", artist: "Miley Cyrus", genre: "Pop", duration: "3:20" },
  { id: "5", title: "As It Was", artist: "Harry Styles", genre: "Pop", duration: "2:47" },
  
  // Funk / BR
  { id: "6", title: "Ela Não Te Ama", artist: "MC Cabelinho", genre: "Funk", duration: "2:54" },
  { id: "7", title: "Deixa Eu Te Amar", artist: "MC Livinho", genre: "Funk", duration: "3:10" },
  { id: "8", title: "Amor ou Litrão", artist: "Petter Ferraz", genre: "Funk", duration: "2:48" },
  { id: "9", title: "Propaga", artist: "MC Ryan SP", genre: "Funk", duration: "2:35" },
  
  // Sertanejo
  { id: "10", title: "Facas", artist: "Diego & Victor Hugo", genre: "Sertanejo", duration: "3:02" },
  { id: "11", title: "Daqui Pra Frente", artist: "Henrique & Juliano", genre: "Sertanejo", duration: "3:15" },
  { id: "12", title: "Milu", artist: "Ana Castela", genre: "Sertanejo", duration: "2:58" },
  
  // Rap
  { id: "13", title: "Aquariana", artist: "Djonga", genre: "Rap", duration: "3:45" },
  { id: "14", title: "Olho de Tigre", artist: "Filipe Ret", genre: "Rap", duration: "3:30" },
  { id: "15", title: "Vida Loka Pt.2", artist: "Racionais MC's", genre: "Rap", duration: "7:52" },
  
  // Internacional / Chill
  { id: "16", title: "Sweater Weather", artist: "The Neighbourhood", genre: "Indie", duration: "4:00" },
  { id: "17", title: "Glimpse of Us", artist: "Joji", genre: "Indie", duration: "3:53" },
  { id: "18", title: "Die For You", artist: "The Weeknd", genre: "R&B", duration: "4:01" },
  { id: "19", title: "Snooze", artist: "SZA", genre: "R&B", duration: "3:21" },
  { id: "20", title: "Nights", artist: "Frank Ocean", genre: "R&B", duration: "5:07" },
];

export const genres = [...new Set(musicLibrary.map(s => s.genre))];
