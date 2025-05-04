declare module 'gulp-using' {
  interface UsingOptions {
    prefix?: string; // Prefix for log messages
    path?: 'relative' | 'absolute'; // Path format
    filesize?: boolean; // Whether to display file sizes
    color?: string; // Color for log messages
  }

  function using(options?: UsingOptions): NodeJS.ReadWriteStream;

  export = using;
}
