interface Window{
  showOpenFilePicker:any;
}

interface FileSystemHandle{
  getFile:{():Promise<File>};
}