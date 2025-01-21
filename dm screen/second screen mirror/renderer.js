const video = document.querySelector('video');
const highlightBox = document.querySelector('#highlight-box');
const errorBox = document.querySelector('#error-box');

window.addEventListener('DOMContentLoaded', () => {
  navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: {
      frameRate: 30
    }
  }).then(stream => {
    video.srcObject = stream
    video.onloadedmetadata = () => video.play()
  }).catch(() => {
    errorBox.innerHTML = 'could not find a second screen; please connect a second screen, grant screen viewing permissions, and reload the app';
    video.style.display = 'none';
  });

  // highlight the video when on the second screen
  window.electronAPI.onUpdateBorder((_, onSecondScreen) => {
    if (onSecondScreen) {
      highlightBox.classList.add('active');
    } else {
      highlightBox.classList.remove('active');
    }
  });
});
