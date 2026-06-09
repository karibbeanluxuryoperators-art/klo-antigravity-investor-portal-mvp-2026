/* Custom Scrollbar para Chat Widget */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 168, 181, 0.5) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 168, 181, 0.5);
  border-radius: 3px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 168, 181, 0.8);
  background-clip: content-box;
}

/* Animation Delays */
.delay-100 {
  animation-delay: 100ms;
}

.delay-200 {
  animation-delay: 200ms;
}

/* Glassmorphism Effect */
.glass {
  background: rgba(26, 46, 53, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 168, 181, 0.2);
}

/* Smooth Transitions */
* {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
