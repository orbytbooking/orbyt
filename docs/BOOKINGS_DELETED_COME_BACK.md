# Why deleted bookings can reappear

If you delete all (or some) **bookings** in the database and they show up again when you open the Admin **Bookings** page, this is usually because of **recurring series**.

## What happens

1. **Recurring series** are stored in the `recurring_series` table. Each row defines a repeating job (customer, service, frequency, etc.) and how many future occurrences to keep (e.g. 8).

2. When you open **Admin → Bookings**, the app calls **`/api/admin/recurring/extend`**. That API:
   - Loads all **active** recurring series for your business
   - For each series, checks how many **future** bookings exist
   - If there are fewer than the configured “occurrences ahead”, it **creates new booking rows** for the next dates

3. So if you **only** delete rows from the **`bookings`** table:
   - The **`recurring_series`** rows are still there
   - On the next Bookings page load, extend runs and **re-creates** bookings from those series

So the bookings “come back” because they are being **regenerated from recurring series**, not from a bug or a separate backup.

## How to stop bookings from coming back

- **Option A – Stop recurrence but keep history**  
  In the database, set recurring series to inactive so extend no longer creates new bookings:

  ```sql
  UPDATE recurring_series SET status = 'inactive' WHERE business_id = 'your-business-id';
  ```

- **Option B – Remove recurring series as well**  
  If you want no recurring-driven bookings at all:

  ```sql
  -- Deactivate or delete the series (bookings that reference them can stay or be deleted)
  UPDATE recurring_series SET status = 'inactive' WHERE business_id = 'your-business-id';
  -- Or delete the series (existing bookings with recurring_series_id will keep that id but the series is gone)
  DELETE FROM recurring_series WHERE business_id = 'your-business-id';
  ```

- **Option C – Full clear (bookings + series)**  
  To wipe both bookings and recurring series for a business:

  ```sql
  DELETE FROM bookings WHERE business_id = 'your-business-id';
  DELETE FROM recurring_series WHERE business_id = 'your-business-id';
  ```

After that, opening the Bookings page will not recreate bookings from recurring series, because there are no active series left.

## Summary

| You delete only…        | Result when you open Bookings |
|-------------------------|-------------------------------|
| `bookings`              | Bookings can come back (extend re-creates from `recurring_series`) |
| `recurring_series`      | No new recurring bookings; existing booking rows stay |
| Both `bookings` and `recurring_series` | No bookings come back from recurrence |

The app does not restore bookings from backups or caches; it only creates **new** rows from active **recurring series** when the extend API runs on page load.
