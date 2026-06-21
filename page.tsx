import { redirect } from 'next/navigation';

export default function RootPage() {
  // Sistem akan terus bawa pengguna ke halaman Login bila link utama dibuka
  redirect('/login');
}