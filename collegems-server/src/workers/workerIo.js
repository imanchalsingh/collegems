let ioRef = null;

export function setWorkerIo(io) {
  ioRef = io;
}

export function getWorkerIo() {
  return ioRef;
}
