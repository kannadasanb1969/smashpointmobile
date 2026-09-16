import{fixtureIsPublished}from'../src/features/organizer/phase5cHelpers';
test('published fixture cannot show publish action',()=>{expect(fixtureIsPublished({id:'x',status:'PUBLISHED'})).toBe(true);expect(fixtureIsPublished({id:'x',status:'DRAFT'})).toBe(false)});
