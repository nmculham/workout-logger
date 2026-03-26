interface Props {
  isOnline: boolean;
}

export default function OfflineBanner({ isOnline }: Props) {
  if (isOnline) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: '#713f12',
      color: '#fde68a',
      fontSize: 13,
      fontWeight: 500,
      textAlign: 'center',
      padding: '6px 16px',
      letterSpacing: 0.3,
    }}>
      Offline — changes will sync when you reconnect
    </div>
  );
}
