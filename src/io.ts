import { app } from "./app";

export function setupFileSelector(element:HTMLInputElement){
  const onChange=(event:Event)=>{
    const files:FileList=(event.target as HTMLInputElement).files!;
    if(files.length==0){
      console.log('Error:No files selected');
    }else if(files.length>1){
      console.log('Error:More than one file selected');
    }else{
      console.log('Info:Ok, the file \"'+files[0].name+'\" is selected');
      app.inputFile = files[0];
    }
  };
  element.addEventListener('change',onChange);
}