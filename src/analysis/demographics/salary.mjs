import _ from 'lodash'
import { ratioToPercentage, appendCompletionToYearlyResults } from '../common.mjs'

export const computeSalaryRangeByYear = async db => {
    const collection = db.collection('normalized_responses')

    const results = await collection
        .aggregate([
            // exclude null and empty values
            { $match: { 'user_info.yearly_salary': { $nin: [null, ''] } } },
            {
                $group: {
                    _id: {
                        salaryRange: `$user_info.yearly_salary`,
                        year: '$year'
                    },
                    total: { $sum: 1 }
                }
            },
            // reshape documents
            {
                $project: {
                    _id: 0,
                    salaryRange: '$_id.salaryRange',
                    year: '$_id.year',
                    total: 1
                }
            }
        ])
        .toArray()

    // group by years and add counts
    const salaryRangeByYear = _.orderBy(
        results.reduce((acc, result) => {
            let yearBucket = acc.find(b => b.year === result.year)
            if (yearBucket === undefined) {
                yearBucket = {
                    year: result.year,
                    buckets: []
                }
                acc.push(yearBucket)
            }

            yearBucket.buckets.push({
                id: result.salaryRange,
                count: result.total
            })

            return acc
        }, []),
        'year'
    )

    // compute percentages
    salaryRangeByYear.forEach(bucket => {
        bucket.total = _.sumBy(bucket.buckets, 'count')
        bucket.buckets.forEach(subBucket => {
            subBucket.percentage = ratioToPercentage(subBucket.count / bucket.total)
        })
    })

    return appendCompletionToYearlyResults(db, salaryRangeByYear)
}

export const computeSalaryByJobTitle = async (db, year) => {
    const collection = db.collection('normalized_responses')

    const results = await collection
        .aggregate([
            // exclude null and empty values
            {
                $match: {
                    'user_info.yearly_salary': { $nin: [null, ''] },
                    'user_info.job_title': { $nin: [null, ''] }
                }
            },
            {
                $group: {
                    _id: {
                        salary: `$user_info.yearly_salary`,
                        jobTitle: '$user_info.job_title'
                    },
                    total: { $sum: 1 }
                }
            },
            // reshape documents
            {
                $project: {
                    _id: 0,
                    salary: '$_id.salary',
                    jobTitle: '$_id.jobTitle',
                    total: 1
                }
            }
        ])
        .toArray()

    return results
}
