import { toggleFullscreen } from '../../../../../shared/js/classroom.js';

document.querySelector('#fullscreen').addEventListener('click', async () => {
  const message = document.querySelector('#message');
  try {
    await toggleFullscreen();
    message.textContent = '';
  } catch (error) {
    message.textContent = error.message;
  }
});

// 在此添加本实验的教学交互。
