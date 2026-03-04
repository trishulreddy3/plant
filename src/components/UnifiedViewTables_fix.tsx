
// Auto-select first table for Make Fault defaults if none selected (Fixed: Moved out of data polling interval)
useEffect(() => {
    if (!mfTableId && tables.length > 0) {
        setMfTableId(tables[0].id);
    }
}, [tables]);
