/* ================================================================
   DOJE — Age Gate + Location (minimal)
   ================================================================ */
(function () {
    'use strict';

    const LEGAL_AGE = 21;
    const STORAGE_KEY = 'doje_age_verified';
    // Remember a successful verification for 30 days so refreshes/return
    // visits skip the gate entirely.
    const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

    function isVerified() {
        try {
            const t = parseInt(localStorage.getItem(STORAGE_KEY), 10);
            return !!t && (Date.now() - t) < REMEMBER_MS;
        } catch (e) {
            return false;
        }
    }

    function rememberVerified() {
        try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) {}
    }

    // If already verified, unlock the site immediately (as early as the
    // script runs) and skip the gate without setting up the form.
    if (isVerified()) {
        const unlock = () => {
            document.body && document.body.classList.remove('age-gate-locked');
            const gate = document.getElementById('ageGate');
            if (gate) gate.remove();
        };
        if (document.body) unlock();
        else document.addEventListener('DOMContentLoaded', unlock);
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

    function init() {
        const gate = document.getElementById('ageGate');
        if (!gate) return;

        // Reveal the form only after the intro video finishes.
        const video = document.getElementById('ageGateVideo');
        let revealed = false;
        const reveal = () => {
            if (revealed) return;
            revealed = true;
            gate.classList.add('video-finished');
            setTimeout(() => {
                try { document.getElementById('dobDay').focus({ preventScroll: true }); } catch (e) {}
            }, 500);
        };
        if (video) {
            const showVideo = () => video.classList.add('is-playing');
            video.addEventListener('playing', showVideo, { once: true });
            video.addEventListener('loadeddata', () => {
                if (video.readyState >= 2) showVideo();
            }, { once: true });
            // Fallback in case neither event fires quickly.
            setTimeout(showVideo, 1500);

            video.addEventListener('ended', reveal);
            video.addEventListener('error', reveal);
            // Safety fallback: if metadata never loads or playback stalls, reveal after 12s.
            setTimeout(reveal, 12000);
        } else {
            reveal();
        }

        const ageStep = document.getElementById('ageStep');
        const locationStep = document.getElementById('locationStep');

        const form = document.getElementById('ageGateForm');
        const dayEl = document.getElementById('dobDay');
        const monthEl = document.getElementById('dobMonth');
        const yearEl = document.getElementById('dobYear');
        const errorEl = document.getElementById('ageGateError');

        const locBtn = document.getElementById('locBtn');
        const locSkip = document.getElementById('locSkip');
        const locStatus = document.getElementById('locStatus');

        const fields = [dayEl, monthEl, yearEl];
        fields.forEach((el, idx) => {
            el.addEventListener('input', () => {
                el.value = el.value.replace(/[^0-9]/g, '');
                if (el.value.length >= el.maxLength && idx < fields.length - 1) fields[idx + 1].focus();
                if (errorEl.textContent) errorEl.textContent = '';
                // Entry happens only on Confirm click — no auto-submit.
            });
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !el.value && idx > 0) fields[idx - 1].focus();
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const d = parseInt(dayEl.value, 10);
            const m = parseInt(monthEl.value, 10);
            const y = parseInt(yearEl.value, 10);

            if (!d || !m || !y || yearEl.value.length !== 4) return showError('Please enter your full date of birth.');
            if (m < 1 || m > 12 || d < 1 || d > 31) return showError('Please enter a valid date.');

            const dob = new Date(y, m - 1, d);
            if (dob.getFullYear() !== y || dob.getMonth() !== m - 1 || dob.getDate() !== d) return showError('Please enter a valid date.');
            if (dob > new Date()) return showError('Please enter a valid date.');

            runVerify(computeAge(dob) >= LEGAL_AGE);
        });

        // Run the eye's "scanning" animation, then resolve to pass/deny.
        let verifying = false;
        function runVerify(passed) {
            if (verifying) return;
            verifying = true;
            const eye = document.getElementById('agEye');
            const btn = document.getElementById('agVerifyBtn');
            const label = btn && btn.querySelector('.agv-label');
            if (btn) btn.disabled = true;
            if (label) label.textContent = 'Verifying';
            if (errorEl) errorEl.textContent = '';
            fields.forEach((f) => f.blur());
            if (eye) eye.classList.add('is-verifying');

            setTimeout(() => {
                if (eye) eye.classList.remove('is-verifying');
                if (passed) {
                    if (eye) eye.classList.add('is-approved');
                    if (label) label.textContent = 'Verified';
                    setTimeout(() => {
                        ageStep.hidden = true;
                        locationStep.hidden = false;
                    }, 700);
                } else {
                    denyEntry();
                }
            }, 1750);
        }

        function showError(msg) { errorEl.textContent = msg; }

        function computeAge(dob) {
            const t = new Date();
            let a = t.getFullYear() - dob.getFullYear();
            const m = t.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && t.getDate() < dob.getDate())) a--;
            return a;
        }

        function denyEntry() {
            gate.classList.add('is-denied');
            const eye = document.getElementById('agEye');
            if (eye) { eye.classList.remove('is-verifying', 'is-approved'); eye.classList.add('is-denied'); }
            const eyebrow = document.getElementById('agEyebrow');
            const title = document.getElementById('ageGateTitle');
            const desc = document.getElementById('agDesc');
            if (eyebrow) eyebrow.innerHTML = '<span>Access Denied</span>';
            if (title) title.innerHTML = 'NOT OLD<br>ENOUGH';
            if (desc) desc.textContent = 'You must be 21 or older to enter. Please come back when you’re of legal drinking age. Drink responsibly.';
            if (form) form.style.display = 'none';
        }

        locBtn.addEventListener('click', () => {
            if (!('geolocation' in navigator)) {
                locStatus.textContent = "Geolocation isn't supported by your browser.";
                setTimeout(finish, 1200);
                return;
            }
            locBtn.disabled = true;
            locBtn.textContent = 'Requesting…';
            locStatus.textContent = 'Please allow location access in your browser.';

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    locStatus.textContent = 'Location detected. Resolving region…';
                    reverseGeocode(latitude, longitude)
                        .then((label) => {
                            locStatus.textContent = label
                                ? "You're in " + label + "."
                                : 'Location captured (' + latitude.toFixed(2) + '°, ' + longitude.toFixed(2) + '°).';
                            setTimeout(finish, 1100);
                        })
                        .catch(() => {
                            locStatus.textContent = 'Location captured.';
                            setTimeout(finish, 900);
                        });
                },
                (err) => {
                    locBtn.disabled = false;
                    locBtn.textContent = 'Try Again';
                    if (err && err.code === 1) locStatus.textContent = 'Permission denied. You can still skip and continue.';
                    else locStatus.textContent = "We couldn't access your location. You can still skip and continue.";
                },
                { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
            );
        });

        locSkip.addEventListener('click', finish);

        function reverseGeocode(lat, lon) {
            const url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lon + '&zoom=10&addressdetails=1';
            return fetch(url, { headers: { Accept: 'application/json' } })
                .then((r) => r.ok ? r.json() : Promise.reject())
                .then((data) => {
                    const a = (data && data.address) || {};
                    const city = a.city || a.town || a.village || a.county || a.state_district;
                    const region = a.state || a.region;
                    const country = a.country;
                    return [city, region, country].filter(Boolean).join(', ');
                });
        }

        function finish() {
            rememberVerified();
            gate.classList.add('is-hidden');
            document.body.classList.remove('age-gate-locked');
            setTimeout(() => { gate.remove(); }, 600);
        }

    }
})();
