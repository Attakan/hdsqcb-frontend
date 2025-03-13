import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
  
  // This won't be rendered due to the redirect
  return null;
}
