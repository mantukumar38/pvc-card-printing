// PVC Card components using AI-generated realistic images

interface CardImageProps {
  cardName: string;
  cardNameHindi?: string;
  emoji: string;
  badgeColor: string;
}

// Single high-quality AI-generated PVC cards collage image
const CARD_COLLAGE_IMAGE = "/images/cards/aadhaar-card.jpg";

export function PVCCardImage({ cardName, cardNameHindi, emoji, badgeColor }: CardImageProps) {
  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
      <img
        src={CARD_COLLAGE_IMAGE}
        alt={cardName}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          img.style.display = "none";
          const parent = img.parentElement!;
          parent.innerHTML = `<div class="flex items-center justify-center h-full text-7xl">${emoji}</div>`;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20"></div>
      <div className={`absolute top-3 right-3 ${badgeColor} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg`}>
        PVC CARD
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl drop-shadow-2xl">
        {emoji}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
        <h3 className="text-white font-black text-lg drop-shadow-lg">
          {cardName}
        </h3>
        {cardNameHindi && (
          <p className="text-yellow-300 text-sm font-semibold drop-shadow-lg">
            {cardNameHindi}
          </p>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-white/10 pointer-events-none"></div>
    </div>
  );
}

export function AadhaarCard() {
  return <PVCCardImage cardName="Aadhaar Card" cardNameHindi="आधार कार्ड" emoji="🆔" badgeColor="bg-orange-500" />;
}

export function PanCard() {
  return <PVCCardImage cardName="PAN Card" cardNameHindi="पैन कार्ड" emoji="💳" badgeColor="bg-blue-600" />;
}

export function VoterCard() {
  return <PVCCardImage cardName="Voter ID Card" cardNameHindi="वोटर आईडी" emoji="🗳️" badgeColor="bg-amber-500" />;
}

export function DrivingLicence() {
  return <PVCCardImage cardName="Driving Licence" cardNameHindi="ड्राइविंग लाइसेंस" emoji="🚗" badgeColor="bg-green-600" />;
}

export function AyushmanCard() {
  return <PVCCardImage cardName="Ayushman Card" cardNameHindi="आयुष्मान भारत" emoji="❤️" badgeColor="bg-red-600" />;
}

export function RCBookCard() {
  return <PVCCardImage cardName="RC Book / Vahan" cardNameHindi="आरसी बुक" emoji="🚛" badgeColor="bg-purple-600" />;
}

export function FarmerIDCard() {
  return <PVCCardImage cardName="Farmer ID Card" cardNameHindi="किसान कार्ड" emoji="🌾" badgeColor="bg-green-700" />;
}

export function CustomCard() {
  return <PVCCardImage cardName="Custom Design" cardNameHindi="कस्टम डिज़ाइन" emoji="✨" badgeColor="bg-pink-600" />;
}
