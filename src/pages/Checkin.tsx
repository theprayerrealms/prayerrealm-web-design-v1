import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    query,
    where,
    getDocs,
    updateDoc,
    increment,
} from 'firebase/firestore';

const Checkin = () => {
    const { eventId } = useParams();
    const [step, setStep] = useState<'LOGIN' | 'PHONE' | 'SUCCESS'>('LOGIN');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
    const [eventData, setEventData] = useState<any>(null);

    // Fetch Event Details when page loads
    useEffect(() => {
        const fetchEvent = async () => {
            if (!eventId) {
                setPageLoading(false);
                return;
            }
            try {
                const eventRef = doc(db, 'events', eventId);
                const eventSnap = await getDoc(eventRef);
                if (eventSnap.exists()) {
                    setEventData(eventSnap.data());
                }
            } catch (err) {
                console.error("Failed to load event:", err);
            } finally {
                setPageLoading(false);
            }
        };
        fetchEvent();
    }, [eventId]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (step === 'SUCCESS') {
            timeoutId = setTimeout(() => {
                window.location.href = 'https://whatsapp.com/channel/0029VaePokfKWEKyglGOT51j';
            }, 5000);
        }
        return () => clearTimeout(timeoutId);
    }, [step]);

    const performCheckIn = async (uid: string, email: string, name: string, phoneNumber?: string) => {
        setLoading(true);
        try {
            const eId = eventId || 'unknown';

            // Check if already checked in (uid + eventId combo)
            const existingQ = query(
                collection(db, 'attendances'),
                where('uid', '==', uid),
                where('eventId', '==', eId)
            );
            const existingSnap = await getDocs(existingQ);

            if (!existingSnap.empty) {
                setAlreadyCheckedIn(true);
                setStep('SUCCESS');
                toast.info('You were already checked in!');
                return;
            }

            // Get user phone number from attendee_users if not provided in arguments
            let finalPhone = phoneNumber;
            if (!finalPhone) {
                const userRef = doc(db, 'attendee_users', uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    finalPhone = userSnap.data()?.phone || '';
                }
            }

            // If no phone provided and not in user profile, ask for it
            if (!finalPhone) {
                setUserData({ uid, email, name });
                setStep('PHONE');
                toast.info('Almost there! Just need your phone number.');
                return;
            }

            // Save/update user profile in attendee_users
            const userRef = doc(db, 'attendee_users', uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const existingData = userSnap.data();
                if (!existingData.phone && finalPhone) {
                    await setDoc(userRef, {
                        phone: finalPhone,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                }
            } else {
                await setDoc(userRef, {
                    uid,
                    email,
                    name,
                    phone: finalPhone,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            // Write attendance record
            const docId = `${eId}_${uid}`;
            await setDoc(doc(db, 'attendances', docId), {
                uid,
                email,
                name,
                phone: finalPhone,
                eventId: eId,
                eventName: eventData?.title || 'Unknown Event',
                wrestleVersion: eventData?.wrestleVersion || 'Unknown',
                timeCheckedIn: new Date().toISOString(),
            });

            // Increment the check-in count for the event
            try {
                const eventRef = doc(db, 'events', eId);
                await updateDoc(eventRef, {
                    checkInCount: increment(1)
                });
            } catch (err) {
                console.error("Failed to increment event check-in count:", err);
            }

            setStep('SUCCESS');
            toast.success('Checked in successfully! God bless you 🙏');
        } catch (error: any) {
            console.error('Check-in error:', error);
            toast.error(error.message || 'Failed to check in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            await performCheckIn(user.uid, user.email || '', user.displayName || 'Guest');
        } catch (error: any) {
            console.error('Google Sign In Error', error);
            toast.error('Failed to sign in with Google. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone || phone.length < 5) {
            toast.error('Please enter a valid phone number');
            return;
        }
        await performCheckIn(userData.uid, userData.email, userData.name, phone);
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#070708]">
                <Loader2 className="w-10 h-10 animate-spin text-red-600" />
            </div>
        );
    }

    if (eventId && !eventData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#070708] px-4">
                <div className="max-w-md w-full bg-white/5 border border-white/10 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl text-center">
                    <h2 className="text-2xl font-black text-white italic uppercase mb-2">Event Not Found</h2>
                    <p className="text-white/40 text-sm font-bold uppercase tracking-widest">
                        The event ID "{eventId}" does not exist in the database.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#070708] py-12 px-4 relative overflow-hidden">
            {/* Background glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-md w-full space-y-8 bg-white/5 border border-white/10 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl relative z-10">
                <div className="text-center">
                    <img src="/LOGO 2.png" alt="PrayerRealm" className="h-16 mx-auto object-contain mb-6" />
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                        {eventData?.title || 'Event'} <span className="text-red-500">Check-in</span>
                    </h2>
                    {eventData?.wrestleVersion && (
                        <div className="mt-3 mb-2 inline-block bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Version {eventData.wrestleVersion}
                        </div>
                    )}
                    <p className="mt-4 text-xs text-white/40 uppercase tracking-widest font-bold">
                        {step === 'LOGIN' && 'Scan & sign in to mark your attendance'}
                        {step === 'PHONE' && 'One last step — add your phone'}
                        {step === 'SUCCESS' && (alreadyCheckedIn ? 'Already checked in' : 'You are checked in!')}
                    </p>
                </div>

                {step === 'LOGIN' && (
                    <div className="mt-8 space-y-4">
                        <Button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 hover:bg-gray-100 h-14 text-sm font-bold shadow-lg transition-all rounded-2xl border-0"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                                        <g>
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                        </g>
                                    </svg>
                                    Sign in with Google
                                </>
                            )}
                        </Button>
                        <p className="text-center text-[10px] text-white/20 uppercase tracking-widest font-bold">
                            Your data is only used for attendance records
                        </p>
                    </div>
                )}

                {step === 'PHONE' && (
                    <form onSubmit={handlePhoneSubmit} className="mt-8 space-y-6">
                        <div className="space-y-3">
                            <h3 className="text-lg font-black text-white italic">
                                Welcome {userData?.name?.split(' ')[0]} 👋
                            </h3>
                            <p className="text-xs text-white/40 uppercase tracking-widest font-bold leading-relaxed">
                                Add your phone number to complete check-in. You'll only need to do this once.
                            </p>
                            <Input
                                type="tel"
                                required
                                className="bg-white/5 border border-white/10 text-white placeholder:text-white/20 h-14 rounded-2xl px-5 text-sm focus:border-red-600 focus:outline-none"
                                placeholder="+234 or +1 followed by your number"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 text-white h-14 rounded-2xl font-bold italic uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Check-in'}
                        </Button>
                    </form>
                )}

                {step === 'SUCCESS' && (
                    <div className="mt-8 text-center space-y-6">
                        <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-500/10 border border-green-500/30">
                            <CheckCircle className="h-12 w-12 text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white italic uppercase">
                                {alreadyCheckedIn ? 'Already Checked In!' : "You're In! 🙌"}
                            </h3>
                            <p className="text-white/40 text-sm mt-2 font-bold uppercase tracking-widest">
                                {alreadyCheckedIn
                                    ? 'Your attendance was already recorded.'
                                    : 'Your attendance has been recorded. Enjoy the event!'}
                            </p>
                        </div>
                        <p className="text-xs text-amber-500/60 font-bold uppercase tracking-widest">
                            God bless you 🙏
                        </p>
                        
                        <div className="pt-4 border-t border-white/10">
                            <p className="text-xs text-white/60 mb-4 font-bold uppercase tracking-widest">
                                Redirecting to WhatsApp in 5s...
                            </p>
                            <Button
                                onClick={() => window.open('https://whatsapp.com/channel/0029VaePokfKWEKyglGOT51j', '_blank')}
                                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white h-14 rounded-2xl font-bold italic uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(37,211,102,0.3)]"
                            >
                                <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                Join WhatsApp Channel
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Checkin;
