

frappe.provide("geslog.list")

geslog.list.get_status_indicator = function (doc){

     const status_indicator_color = {
            'Pending': "orange",
            'Transferred': 'blue',
            'Submitted': "blue",
            'Draft': "red",
            "Cancelled": "red",
        };

    return [__(doc.status), status_indicator_color[doc.status]]
}