

frappe.provide("geslog.datetime")

geslog.datetime.get_range_years_list = function (current_year, n_years){
    current_year = current_year - n_years
    let year_list = []
    for(let i = 0; i < n_years * 2; i++){
        year_list.push(current_year + i)
    }
    return year_list
}

