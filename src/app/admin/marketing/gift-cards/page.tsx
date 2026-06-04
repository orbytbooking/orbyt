import { redirect } from 'next/navigation';

/** Legacy route — gift cards are managed under Marketing. */
export default function GiftCardsPage() {
  redirect('/admin/marketing');
}
