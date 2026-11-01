import imageCompression from "browser-image-compression";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { clientAuth, clientStorage } from "@/lib/firebase/client";

export function compressAvatar(file: File): Promise<File> {
  return imageCompression(file, { maxSizeMB: 0.05, maxWidthOrHeight: 256, fileType: "image/webp", useWebWorker: true });
}

export async function uploadAvatar(file: File): Promise<string> {
  const uid = clientAuth().currentUser?.uid;
  if (!uid) throw new Error("Sign in before uploading an avatar");
  // storage.rules only accept uploads into the signer's own folder.
  const avatarRef = ref(clientStorage(), `avatars/${uid}/${crypto.randomUUID()}.webp`);
  await uploadBytes(avatarRef, file, { contentType: "image/webp" });
  return getDownloadURL(avatarRef);
}
