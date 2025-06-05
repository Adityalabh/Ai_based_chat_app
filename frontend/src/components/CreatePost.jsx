import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { readFileAsDataURL } from '@/lib/utils';
import { Loader2, Wand2, Mic, MicOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setPosts } from '@/redux/postSlice';

const CreatePost = ({ open, setOpen }) => {
  const imageRef = useRef();
  const [file, setFile] = useState("");
  const [caption, setCaption] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCaptions, setGeneratedCaptions] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const {user} = useSelector(store => store.auth);
  const {posts} = useSelector(store => store.post);
  const dispatch = useDispatch();

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      
      rec.onresult = (event) => {
        let final = '';
        let interim = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        
        if (final) {
          setCaption(prev => prev + final);
        }
        setInterimTranscript(interim);
      };
      
      rec.onend = () => {
        if (isRecording) {
          rec.start();
        } else {
          setInterimTranscript("");
        }
      };
      
      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          setPermissionError(true);
          toast.error("Microphone access denied. Please enable permissions.");
        } else {
          toast.error(`Voice input error: ${event.error}`);
        }
        
        stopRecording();
      };
      
      setRecognition(rec);
    }
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);
  
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error("Microphone permission error:", error);
      setPermissionError(true);
      toast.error("Microphone access denied. Please enable permissions.");
      return false;
    }
  };
  
  const startRecording = async () => {
    if (!recognition) return;
    
    // Check permission first
    if (permissionError || !(await requestMicrophonePermission())) {
      return;
    }
    
    try {
      recognition.start();
      setIsRecording(true);
      toast.info("Listening... Speak now");
    } catch (error) {
      console.error("Recording start error:", error);
      toast.error("Failed to start recording");
    }
  };
  
  const stopRecording = () => {
    if (recognition && isRecording) {
      recognition.stop();
      setIsRecording(false);
      toast.info("Voice input stopped");
    }
  };
  
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };


  const fileChangeHandler = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const dataUrl = await readFileAsDataURL(file);
      setImagePreview(dataUrl);
      setGeneratedCaptions([]);
    }
  };

  const handleGenerateCaption = async () => {
    if (!imagePreview) {
      toast.error("Please upload an image first");
      return;
    }
    
    try {
      setIsGenerating(true);
      const response = await axios.post('/post/generate-caption', 
        { imageUrl: imagePreview },
        { 
          withCredentials: true,
          timeout: 10000
        }
      );
      
      if (response.data.captions) {
        setGeneratedCaptions(response.data.captions);
      } else {
        setGeneratedCaptions(response.data.fallbacks || []);
        toast.info("Using fallback captions");
      }
    } catch (error) {
      console.error("Caption error:", error);
      const clientFallbacks = [
        `My ${new Date().getHours() < 12 ? 'morning' : 'evening'} vibe`,
        "Creating new memories ✨",
        "Perfect moment captured 📸"
      ];
      setGeneratedCaptions(clientFallbacks.sort(() => 0.5 - Math.random()));
      toast.error("AI service unavailable. Using smart fallbacks");
    } finally {
      setIsGenerating(false);
    }
  };

  const createPostHandler = async (e) => {
    // Stop recording if active when posting
    if (isRecording) stopRecording();
    
    const formData = new FormData();
    formData.append("caption", caption);
    if (imagePreview) formData.append("image", file);
    
    try {
      setLoading(true);
      const res = await axios.post('/post/addpost', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });
      
      if (res.data.success) {
        dispatch(setPosts([res.data.post, ...posts]));
        toast.success(res.data.message);
        setOpen(false);
        
        // Reset form
        setCaption("");
        setFile("");
        setImagePreview("");
        setGeneratedCaptions([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        onInteractOutside={() => {
          if (isRecording) stopRecording();
          setOpen(false);
        }}
        className="bg-gray-200 max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-center font-semibold">
            Create New Post
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-3 items-center">
          <Avatar>
            <AvatarImage src={user?.profilePicture} alt="img" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-semibold text-xs">{user?.username}</h1>
          </div>
        </div>

        {/* CAPTION SECTION WITH AI AND VOICE CONTROLS */}
        <div className="relative">
          <Textarea
            value={caption + (isRecording ? ' ' + interimTranscript : '')}
            onChange={(e) => setCaption(e.target.value)}
            className="focus-visible:ring-transparent border-none pr-24 min-h-[80px]"
            placeholder={
              isRecording ? "Speak now..." : "Write a caption or use voice input..."
            }
          />

          <div className="absolute right-2 top-2 flex gap-1">
            {/* Voice Input Button */}
            {isSpeechSupported && (
              <Button
                onClick={toggleRecording}
                className="h-7 px-2"
                variant={
                  permissionError
                    ? "destructive"
                    : isRecording
                    ? "destructive"
                    : "ghost"
                }
                disabled={permissionError}
              >
                {permissionError ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : isRecording ? (
                  <MicOff className="h-4 w-4 text-white" />
                ) : (
                  <Mic className="h-4 w-4 text-gray-700" />
                )}
              </Button>
            )}

            {/* AI Caption Generator Button */}
            <Button
              onClick={handleGenerateCaption}
              disabled={isGenerating || !imagePreview}
              className="h-7 px-2"
              variant="ghost"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 text-blue-500" />
              )}
            </Button>
          </div>
        </div>

        {/* VOICE STATUS INDICATOR */}
        {isRecording && (
          <div className="flex items-center text-sm text-red-600 animate-pulse">
            <div className="w-3 h-3 bg-red-600 rounded-full mr-2 animate-pulse"></div>
            Listening... Click microphone to stop
          </div>
        )}

        {/* PERMISSION ERROR */}
        {permissionError && (
          <div className="text-xs text-red-600 bg-red-100 p-2 rounded mt-1 flex items-start">
            <AlertCircle className="flex-shrink-0 mr-1 h-4 w-4 mt-0.5" />
            <div>
              <p className="font-medium">Microphone access blocked</p>
              <p>
                Please allow microphone permissions in your browser settings to use
                voice input.
              </p>
            </div>
          </div>
        )}

        {/* GENERATED CAPTIONS */}
        {generatedCaptions.length > 0 && (
          <div className="mt-2 bg-blue-50 p-3 rounded-lg">
            <h3 className="text-sm font-medium mb-2">AI Suggestions:</h3>
            <div className="flex flex-wrap gap-2">
              {generatedCaptions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded-full transition-colors"
                  onClick={() => setCaption(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* IMAGE PREVIEW */}
        {imagePreview && (
          <div className="w-full h-64 flex flex-col items-center justify-center">
            <img
              src={imagePreview}
              alt="preview_img"
              className="object-contain h-full w-full rounded-md"
            />
            <Button
              onClick={() => imageRef.current.click()}
              className="mt-2 w-fit hover:bg-[#258bcf] bg-gray-700 text-white"
              variant="outline"
            >
              Change Image
            </Button>
          </div>
        )}

        <input
          ref={imageRef}
          type="file"
          className="hidden"
          onChange={fileChangeHandler}
          accept="image/*"
        />

        {/* INITIAL IMAGE UPLOAD BUTTON */}
        {!imagePreview && (
          <Button
            onClick={() => imageRef.current.click()}
            className="w-full hover:bg-[#258bcf] bg-gray-700 text-white"
          >
            Select Image
          </Button>
        )}

        {/* POST BUTTON */}
        {imagePreview && (
          loading ? (
            <Button className="w-full">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Post...
            </Button>
          ) : (
            <Button
              onClick={createPostHandler}
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={isRecording}
            >
              {isRecording ? "Finish Speaking First" : "Post"}
            </Button>
          )
        )}

        {/* BROWSER SUPPORT WARNING */}
        {!isSpeechSupported && (
          <div className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded mt-2">
            <AlertCircle className="inline mr-1 h-4 w-4" />
            Voice input not supported in your browser. Try Chrome or Edge for best
            results.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CreatePost;