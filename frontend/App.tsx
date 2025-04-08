import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import { decodeJpeg } from "@tensorflow/tfjs-react-native";
import * as FileSystem from "expo-file-system";

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [model, setModel] = useState<tf.LayersModel | null>(null);

  // Load TensorFlow.js and the model
  useEffect(() => {
    async function loadModel() {
      try {
        // Initialize TensorFlow.js with all backends
        await tf.ready();
        console.log("TensorFlow.js is ready");

        // Load the pre-trained model (MobileNet)
        const loadedModel = await tf.loadLayersModel(
          "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json"
        );

        setModel(loadedModel);
        setModelLoaded(true);
        console.log("Model loaded successfully");
      } catch (error) {
        console.error("Failed to load model:", error);
      }
    }

    loadModel();
  }, []);

  // Function to take a photo using the camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      alert("Sorry, we need camera permissions to make this work!");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      classifyImage(result.assets[0].uri);
    }
  };

  // Function to pick an image from the gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions to make this work!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      classifyImage(result.assets[0].uri);
    }
  };

  // Function to classify the image
  const classifyImage = async (uri: string) => {
    if (!modelLoaded) {
      alert("Model is still loading. Please wait.");
      return;
    }

    try {
      setLoading(true);
      setPrediction(null);

      // Read the image data
      const imgB64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const imgBuffer = tf.util.encodeString(imgB64, "base64").buffer;
      const raw = new Uint8Array(imgBuffer);

      // Decode and preprocess the image
      const imageTensor = decodeJpeg(raw);

      // Resize the image to match the model's expected input
      const resized = tf.image.resizeBilinear(imageTensor, [224, 224]);

      // Normalize pixel values to [0, 1]
      const normalized = tf.div(resized, 255);

      // Add batch dimension
      const batched = normalized.expandDims(0);

      // Make prediction
      const predictions = (await model!.predict(batched)) as tf.Tensor;
      const data = await predictions.data();

      // Get the top prediction
      // MobileNet classes for dogs: 151-268, cats: 281-285
      let dogScore = 0;
      let catScore = 0;

      // More precise dog and cat class ranges
      for (let i = 151; i <= 268; i++) {
        dogScore += data[i];
      }

      for (let i = 281; i <= 285; i++) {
        catScore += data[i];
      }

      // Golden retriever (207), Labrador (208), etc.
      dogScore += data[207] * 2; // Give extra weight to common dogs
      dogScore += data[208] * 2;

      // Adjust thresholds for better classification
      if (dogScore > 0.1) {
        setPrediction("Dog");
      } else if (catScore > 0.1) {
        setPrediction("Cat");
      } else {
        // Check top class
        let topClass = 0;
        let topScore = 0;
        for (let i = 0; i < data.length; i++) {
          if (data[i] > topScore) {
            topScore = data[i];
            topClass = i;
          }
        }

        // Check if top class is in dog range
        if (topClass >= 151 && topClass <= 268) {
          setPrediction("Dog");
        } else if (topClass >= 281 && topClass <= 285) {
          setPrediction("Cat");
        } else {
          setPrediction("Unknown");
        }
      }

      setLoading(false);

      // Clean up tensors
      tf.dispose([imageTensor, resized, normalized, batched, predictions]);
    } catch (error) {
      console.error("Classification error:", error);
      setLoading(false);
      alert("Error classifying image. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Cats & Dogs Classifier App</Text>

        <View style={styles.imageContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.selectedImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.predictionContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Analyzing image...</Text>
          </View>
        ) : prediction ? (
          <View style={styles.predictionContainer}>
            <Text style={styles.predictionText}>This is a</Text>
            <Text style={styles.predictionResult}>{prediction}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Capture a Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Select a photo</Text>
        </TouchableOpacity>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4a90e2",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 40,
  },
  illustrationContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 40,
  },
  catIllustration: {
    width: 100,
    height: 100,
    backgroundColor: "#a0c4ff",
    borderRadius: 10,
  },
  dogIllustration: {
    width: 100,
    height: 100,
    backgroundColor: "#a0c4ff",
    borderRadius: 10,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    marginBottom: 20,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#a0c4ff",
  },
  selectedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#fff",
    fontSize: 16,
  },
  predictionContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  predictionText: {
    color: "#fff",
    fontSize: 18,
  },
  predictionResult: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    marginTop: 5,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 10,
  },
  button: {
    backgroundColor: "#ff5252",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    marginBottom: 15,
    width: "80%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
