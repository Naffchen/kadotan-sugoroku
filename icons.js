const art = {
  pose:'<circle cx="32" cy="15" r="8" fill="#fff"/><path d="M23 59V35M41 59V35M24 32l-12-9-4-13M40 32l12-9 4-13M24 30h16v19H24z" fill="none"/><path d="M27 59V46h10v13" fill="none"/>',
  animal:'<path d="M21 29C11 17 14 3 21 5c6 1 7 14 7 21M37 26C39 10 45 4 49 8c5 6-3 17-8 23" fill="#fff"/><path d="M49 44c0 11-7 17-17 17S15 55 15 44s7-19 17-19 17 8 17 19z" fill="#fff"/><circle cx="26" cy="40" r="2.4" fill="currentColor" stroke="none"/><circle cx="39" cy="40" r="2.4" fill="currentColor" stroke="none"/><path d="m29 47 3 3 3-3M32 50v4" fill="none"/>',
  color:'<rect x="7" y="10" width="22" height="26" rx="6" fill="#fa807b" stroke="none" transform="rotate(-12 18 23)"/><rect x="34" y="8" width="23" height="27" rx="6" fill="#63a7e4" stroke="none" transform="rotate(10 45 21)"/><rect x="17" y="30" width="28" height="28" rx="7" fill="#f4d25c" stroke="none"/><path d="M31 45V29c0-5 7-5 7 0v12l4-4 11 6c2 1 3 3 2 6l-4 11H34l-9-11c-3-4 2-8 5-4z" fill="#fff"/>',
  question:'<path d="M8 10h35a8 8 0 0 1 8 8v17a8 8 0 0 1-8 8H24L11 53V42a8 8 0 0 1-6-8V18a8 8 0 0 1 3-8z" fill="#fff"/><path d="M22 23c0-10 17-10 17-1 0 5-8 5-8 10" fill="none"/><circle cx="31" cy="37" r="1.8" fill="currentColor" stroke="none"/><path d="M49 22h4a6 6 0 0 1 6 6v21l-10-4" fill="none"/>',
  ball:'<circle cx="32" cy="32" r="25" fill="#fff"/><path d="M10 21c13 5 22 21 21 36M34 7c-4 16 5 32 22 35" fill="#f5bd69"/><path d="M9 43C22 32 44 29 57 29" fill="none"/>',
  carry:'<circle cx="12" cy="15" r="6" fill="#fff"/><circle cx="52" cy="15" r="6" fill="#fff"/><path d="M7 58V29h10v29M47 58V29h10v29M16 33l8 8M48 33l-8 8" fill="none"/><path d="M18 37q14 18 28 0l-4 15H22z" fill="#fff"/><path d="M25 29c0-8 9-8 9-2 1-6 10-4 9 3-1 5-9 9-9 9s-8-5-9-10z" fill="#e9a0b1" stroke="none"/>',
  goal:'<path d="M17 9h30v17c0 14-30 14-30 0z" fill="#fff"/><path d="M16 15H7v9c0 8 8 10 13 9M48 15h9v9c0 8-8 10-13 9M32 37v13M22 55h20M27 50h10" fill="none"/><path d="m32 13 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1z" fill="#f1c342" stroke="none"/>',
  people:'<circle cx="23" cy="20" r="8" fill="none"/><circle cx="44" cy="23" r="6" fill="none"/><path d="M8 53V43c0-16 30-16 30 0v10M40 36c11 0 16 6 16 15" fill="none"/>',
  gear:'<path d="m25 8-2 7-7 4-7-1-5 9 5 5v8l-4 5 5 8 8-1 6 4 3 7h10l3-7 6-4 7 1 5-9-5-5v-7l5-6-5-9-8 1-6-4-2-6z" fill="none" transform="translate(3 -3) scale(.95)"/><circle cx="32" cy="32" r="10" fill="none"/>',
  info:'<circle cx="32" cy="32" r="25" fill="none"/><path d="M32 29v17" fill="none"/><circle cx="32" cy="19" r="2.5" fill="currentColor" stroke="none"/>',
  expand:'<path d="M24 9H9v15M40 9h15v15M9 40v15h15M55 40v15H40" fill="none"/>',
  volume:'<path d="M9 25h12l15-12v38L21 39H9zM43 22c9 6 9 14 0 20M49 13c17 12 17 26 0 38" fill="none"/>',
  muted:'<path d="M9 25h12l15-12v38L21 39H9zM44 24l13 16M57 24 44 40" fill="none"/>',
  undo:'<path d="M22 13 8 27l14 12M10 27h27c22 0 23 27 0 27H25" fill="none"/>',
  check:'<path d="m13 33 13 13 27-28" fill="none" stroke-width="6"/>',
  close:'<path d="m17 17 30 30M47 17 17 47" fill="none"/>',
  dice:'<rect x="9" y="9" width="46" height="46" rx="10" fill="none"/><circle cx="22" cy="22" r="4" fill="currentColor" stroke="none"/><circle cx="32" cy="32" r="4" fill="currentColor" stroke="none"/><circle cx="42" cy="42" r="4" fill="currentColor" stroke="none"/>',
  star:'<path d="m32 7 8 16 18 3-13 13 3 18-16-9-16 9 3-18L6 26l18-3z" fill="none"/>',
  play:'<path d="m22 12 30 20-30 20z" fill="currentColor" stroke="none"/>',
  music:'<path d="M25 45V15l28-6v30M25 23l28-6" fill="none"/><ellipse cx="17" cy="47" rx="8" ry="6" fill="currentColor" stroke="none"/><ellipse cx="45" cy="41" rx="8" ry="6" fill="currentColor" stroke="none"/>',
  hands:'<path d="m18 42-7-17c-2-5 3-6 5-2l4 8-6-17c-2-5 4-6 6-1l6 15-3-19c-1-5 5-6 6-1l3 18 2-14c1-5 7-4 6 1l-1 22 8-5c5-3 9 2 5 6L39 52c-11 9-18 1-21-10z" fill="#fff"/>',
};
export function icon(name, size=32) {
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(art[name]||art.star)+'</svg>';
}
