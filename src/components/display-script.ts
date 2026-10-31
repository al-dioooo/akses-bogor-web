// Pengaturan tampilan disimpan di browser dan dipasang ke <html> sebelum halaman digambar, supaya mode
// warna yang dipilih tidak berkedip. Dipakai skrip di layout dan komponen DisplaySettings.
export const DISPLAY_STORAGE_KEY = "aksesbogor-tampilan";

export const DISPLAY_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("${DISPLAY_STORAGE_KEY}")||"{}"),d=document.documentElement;if(["terang","gelap"].indexOf(s.theme)>-1)d.dataset.theme=s.theme;if(s.motion==="off")d.dataset.motion="off"}catch(e){}`;
